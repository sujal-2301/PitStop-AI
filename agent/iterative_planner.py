# agent/iterative_planner.py
"""
Iterative Planner Agent that:
1. Parses user input and extracts constraints
2. Generates initial candidate strategies
3. Simulates candidates
4. Analyzes results and refines candidates
5. Repeats until convergence or max iterations
6. Returns full trace of agent's thinking process
"""

import json
import requests
from typing import Dict, List, Any, Optional
from agent.config import LLMConfig
from agent.llm_client import ChatClient


class AgentTrace:
    """Captures the agent's decision-making process"""

    def __init__(self):
        self.iterations = []
        self.user_query = ""
        self.parsed_constraints = {}
        self.total_simulations = 0
        self.total_tokens = 0
        self.thinking_steps = []

    def add_iteration(self, iteration_data: Dict[str, Any]):
        self.iterations.append(iteration_data)

    def add_thinking(self, step: str):
        self.thinking_steps.append(step)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_query": self.user_query,
            "parsed_constraints": self.parsed_constraints,
            "thinking_steps": self.thinking_steps,
            "iterations": self.iterations,
            "total_simulations": self.total_simulations,
            "total_tokens": self.total_tokens,
            "final_iteration": len(self.iterations),
        }


SYSTEM_CONSTRAINT_PARSER = """You are a racing strategy constraint parser.
Extract these fields from the user's query:
- base_lap: Current lap number
- base_target_gap_s: Current gap to competitor (positive = ahead, negative = behind)
- current_compound: Current tire compound (soft/medium/hard)
- current_tire_age: Current tire age in laps
- objective: What the user wants (e.g., "extend lead", "overtake", "minimize risk")
- constraints: Any specific requirements (e.g., "must pit before lap 15", "only use hard tires")

Return ONLY valid JSON with these fields. Use null for missing values."""


SYSTEM_CANDIDATE_GENERATOR = """You are a racing strategy generator.
Given the current race state and objective, propose 2-4 candidate pit strategies.

Consider:
- Tire degradation (soft degrades fastest, hard slowest)
- Pit timing (early undercut vs late overcut)
- Compound selection based on objective
- Variety in strategies (aggressive vs conservative)

Return ONLY a JSON array of candidates:
[
  {"pit_lap": int, "compound": "soft|medium|hard", "rationale": "why this strategy"},
  ...
]"""


SYSTEM_REFINER = """You are a racing strategy refiner.
You've seen simulation results. Analyze which strategies work and propose refinements.

Your job:
1. Identify which strategies are promising (high median gap)
2. Propose variations to explore (e.g., pit 1 lap earlier/later, different compound)
3. Decide if we should stop (converged) or continue exploring

Return JSON:
{
  "analysis": "brief analysis of results",
  "should_continue": true/false,
  "new_candidates": [{...}] or null,
  "reasoning": "why continue or stop"
}"""


def _safe_int(val, default):
    try:
        return int(val) if val is not None else default
    except (ValueError, TypeError):
        return default


def _safe_float(val, default):
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


def _safe_compound(val, default="medium"):
    if isinstance(val, str):
        v = val.lower().strip()
        if v in {"soft", "medium", "hard"}:
            return v
    return default


class IterativePlanner:
    """Agent that iteratively refines strategies until convergence"""

    def __init__(self, cfg: LLMConfig):
        self.cfg = cfg
        self.client = ChatClient(cfg)
        self.trace = AgentTrace()
        self.max_iterations = 3
        self.convergence_threshold = 0.1  # seconds

    def parse_constraints(self, user_text: str) -> Dict[str, Any]:
        """Step 1: Parse user query into structured constraints"""
        self.trace.user_query = user_text
        self.trace.add_thinking(
            "🧠 Parsing user query to extract race constraints...")

        messages = [
            {"role": "system", "content": SYSTEM_CONSTRAINT_PARSER},
            {"role": "user", "content": user_text},
        ]

        resp = self.client.chat(
            model=self.cfg.planner_model,
            messages=messages,
            max_tokens=300,
            temperature=0.0,
        )

        content = resp["choices"][0]["message"].get("content", "{}")
        self.trace.total_tokens += resp.get("usage", {}).get("total_tokens", 0)

        try:
            constraints = json.loads(content)
        except json.JSONDecodeError:
            # Fallback: extract JSON from content
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                constraints = json.loads(json_match.group())
            else:
                constraints = {}

        # Normalize constraints
        constraints["base_lap"] = _safe_int(constraints.get("base_lap"), 10)
        constraints["base_target_gap_s"] = _safe_float(
            constraints.get("base_target_gap_s"), 0.0)
        constraints["current_compound"] = _safe_compound(
            constraints.get("current_compound"))
        constraints["current_tire_age"] = _safe_int(
            constraints.get("current_tire_age"), 6)

        # Interpret "behind/ahead" from user text
        text = user_text.lower()
        gap = constraints["base_target_gap_s"]
        if "behind" in text and gap > 0:
            constraints["base_target_gap_s"] = -abs(gap)
        elif "ahead" in text and gap < 0:
            constraints["base_target_gap_s"] = abs(gap)

        self.trace.parsed_constraints = constraints
        self.trace.add_thinking(
            f"✅ Constraints: {json.dumps(constraints, indent=2)}")

        return constraints

    def generate_candidates(self, constraints: Dict[str, Any], context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Step 2: Generate candidate strategies"""
        self.trace.add_thinking("🎯 Generating candidate pit strategies...")

        prompt = f"""Current race state:
- Lap: {constraints['base_lap']}
- Gap: {constraints['base_target_gap_s']:.2f}s ({'ahead' if constraints['base_target_gap_s'] >= 0 else 'behind'})
- Current tires: {constraints['current_compound']}, age {constraints['current_tire_age']} laps
- Objective: {constraints.get('objective', 'optimize strategy')}
- Constraints: {constraints.get('constraints', 'none')}
"""

        if context:
            prompt += f"\n{context}"

        messages = [
            {"role": "system", "content": SYSTEM_CANDIDATE_GENERATOR},
            {"role": "user", "content": prompt},
        ]

        resp = self.client.chat(
            model=self.cfg.planner_model,
            messages=messages,
            max_tokens=500,
            temperature=0.3,  # Slight creativity for variety
        )

        content = resp["choices"][0]["message"].get("content", "[]")
        self.trace.total_tokens += resp.get("usage", {}).get("total_tokens", 0)

        try:
            candidates = json.loads(content)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                candidates = json.loads(json_match.group())
            else:
                candidates = []

        # Normalize candidates
        normalized = []
        for c in candidates:
            if isinstance(c, dict):
                pit_lap = _safe_int(c.get("pit_lap"), None)
                compound = _safe_compound(c.get("compound"))
                if pit_lap and pit_lap > constraints["base_lap"]:
                    normalized.append({
                        "pit_lap": pit_lap,
                        "compound": compound,
                        "rationale": c.get("rationale", "")
                    })

        # Ensure at least 2 candidates
        if len(normalized) < 2:
            base = constraints["base_lap"]
            normalized = [
                {"pit_lap": base + 2, "compound": "medium",
                    "rationale": "Conservative early stop"},
                {"pit_lap": base + 5, "compound": "hard",
                    "rationale": "Late stop on durable tires"},
            ]

        candidates_str = [
            f"L{c['pit_lap']} {c['compound']}" for c in normalized]
        self.trace.add_thinking(
            f"✅ Generated {len(normalized)} candidates: {candidates_str}")

        return normalized

    def simulate_candidates(self, constraints: Dict[str, Any], candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Step 3: Run simulation for candidates"""
        self.trace.add_thinking(
            f"🎲 Simulating {len(candidates)} strategies...")

        sim_args = {
            "base_lap": constraints["base_lap"],
            "base_target_gap_s": constraints["base_target_gap_s"],
            "current_compound": constraints["current_compound"],
            "current_tire_age": constraints["current_tire_age"],
            "candidates": [{"pit_lap": c["pit_lap"], "compound": c["compound"]} for c in candidates],
            "mc_samples": 400,
        }

        # Add SC window if present
        if constraints.get("sc_window"):
            sim_args["sc_window"] = constraints["sc_window"]

        try:
            r = requests.post(self.cfg.sim_api_url, json=sim_args, timeout=60)
            r.raise_for_status()
            sim_result = r.json()
            self.trace.total_simulations += len(candidates)
            self.trace.add_thinking(f"✅ Simulation complete")
            return sim_result
        except Exception as e:
            self.trace.add_thinking(f"❌ Simulation failed: {e}")
            raise

    def analyze_and_refine(self, sim_result: Dict[str, Any], iteration: int) -> Dict[str, Any]:
        """Step 4: Analyze results and decide if refinement needed"""
        self.trace.add_thinking(
            f"📊 Analyzing iteration {iteration} results...")

        cands = sim_result.get("candidates", [])
        if not cands:
            return {"should_continue": False, "reasoning": "No candidates to analyze"}

        # Find best and second-best
        sorted_cands = sorted(cands, key=lambda c: c.get(
            "median_gap_after_5_laps", float('-inf')), reverse=True)
        best = sorted_cands[0]
        second = sorted_cands[1] if len(sorted_cands) > 1 else None

        best_gap = best.get("median_gap_after_5_laps", 0.0)
        second_gap = second.get("median_gap_after_5_laps",
                                0.0) if second else best_gap

        delta = abs(best_gap - second_gap)

        # Summary for LLM
        summary = f"""Iteration {iteration} results:
- Best: Pit L{best['candidate']['pit_lap']} ({best['candidate']['compound']}) → {best_gap:.2f}s @ +5 laps
"""
        for i, c in enumerate(sorted_cands[:4]):
            summary += f"- Option {i+1}: L{c['candidate']['pit_lap']} ({c['candidate']['compound']}) → {c['median_gap_after_5_laps']:.2f}s\n"

        summary += f"\nGap between best and 2nd: {delta:.2f}s"

        # Decide if we should continue
        if iteration >= self.max_iterations:
            self.trace.add_thinking(
                f"⏹️ Max iterations ({self.max_iterations}) reached")
            return {
                "should_continue": False,
                "reasoning": f"Reached max iterations. Best strategy: L{best['candidate']['pit_lap']} {best['candidate']['compound']}",
                "analysis": summary,
            }

        if delta < self.convergence_threshold:
            self.trace.add_thinking(
                f"✅ Converged (delta: {delta:.2f}s < {self.convergence_threshold}s)")
            return {
                "should_continue": False,
                "reasoning": f"Converged. Top strategies are within {delta:.2f}s",
                "analysis": summary,
            }

        # Ask LLM for refinement suggestions
        messages = [
            {"role": "system", "content": SYSTEM_REFINER},
            {"role": "user", "content": summary},
        ]

        resp = self.client.chat(
            model=self.cfg.planner_model,
            messages=messages,
            max_tokens=400,
            temperature=0.2,
        )

        content = resp["choices"][0]["message"].get("content", "{}")
        self.trace.total_tokens += resp.get("usage", {}).get("total_tokens", 0)

        try:
            refinement = json.loads(content)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                refinement = json.loads(json_match.group())
            else:
                refinement = {"should_continue": False}

        self.trace.add_thinking(
            f"🔍 Analysis: {refinement.get('analysis', 'No analysis')}")

        return refinement

    def plan_iteratively(self, user_text: str) -> Dict[str, Any]:
        """Main orchestration: iteratively refine strategies"""

        # Step 1: Parse constraints
        constraints = self.parse_constraints(user_text)

        # Step 2: Generate initial candidates
        candidates = self.generate_candidates(constraints)

        best_sim_result = None

        for iteration in range(1, self.max_iterations + 1):
            self.trace.add_thinking(
                f"\n{'='*50}\n🔄 ITERATION {iteration}\n{'='*50}")

            # Step 3: Simulate
            sim_result = self.simulate_candidates(constraints, candidates)
            best_sim_result = sim_result  # Keep latest

            # Record iteration
            self.trace.add_iteration({
                "iteration": iteration,
                "candidates": candidates,
                "results": sim_result.get("candidates", []),
            })

            # Step 4: Analyze and decide
            refinement = self.analyze_and_refine(sim_result, iteration)

            if not refinement.get("should_continue", False):
                self.trace.add_thinking(
                    f"✅ Stopping: {refinement.get('reasoning', 'Complete')}")
                break

            # Step 5: Generate refined candidates
            context = f"Previous results:\n{refinement.get('analysis', '')}\n\nPropose new variations to explore."
            candidates = self.generate_candidates(constraints, context)

        self.trace.add_thinking(
            f"\n{'='*50}\n✨ FINAL RECOMMENDATION\n{'='*50}")

        # Build final tool args from best result
        best_idx = max(
            range(len(best_sim_result["candidates"])),
            key=lambda i: best_sim_result["candidates"][i].get(
                "median_gap_after_5_laps", float('-inf'))
        )
        best = best_sim_result["candidates"][best_idx]

        self.trace.add_thinking(
            f"🏆 Best Strategy: Pit L{best['candidate']['pit_lap']} ({best['candidate']['compound']}) → {best['median_gap_after_5_laps']:.2f}s")

        return {
            "tool_args": {
                "base_lap": constraints["base_lap"],
                "base_target_gap_s": constraints["base_target_gap_s"],
                "current_compound": constraints["current_compound"],
                "current_tire_age": constraints["current_tire_age"],
                "candidates": [c["candidate"] for c in best_sim_result["candidates"]],
                "mc_samples": 400,
            },
            "sim_result": best_sim_result,
            "trace": self.trace.to_dict(),
        }
