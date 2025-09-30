# agent/explainer.py
import json
from typing import Dict, Any
from agent.config import LLMConfig
from agent.llm_client import ChatClient
from agent.schemas import Explanation
from pydantic import ValidationError

SYSTEM_EXPLAINER = (
    "You are the PitStop AI EXPLAINER. You will receive the validated JSON output from the run_sim tool. "
    "Return ONLY a single JSON object (no surrounding prose, no markdown) that strictly matches this structure:\n"
    "{\n"
    '  "decision": "<single-line recommendation>",\n'
    '  "rationale": ["<bullet 1>", "<bullet 2>", "<bullet 3 (optional)>"],\n'
    '  "assumptions": ["<assumption A>", "<assumption B>", ...],\n'
    '  "risks": ["<risk A>", "<risk B>", ...],\n'
    '  "fallback": "<what to do if plan invalidates>",\n'
    '  "metrics": {"median_gap_by_lap": {"lap": <int>, "gap_seconds": <float>}}  # optional\n'
    "}\n"
    "Rules:\n"
    "1) Use ONLY numeric values and fields present in the run_sim JSON. Do NOT invent values. If the specific metric is not present, omit it.\n"
    "2) Keep rationale limited to at most 3 compact bullets. Each bullet must be actionable and reference a sim value if relevant.\n"
    "3) The decision field must be a single short line (e.g., 'Pit lap 12 (medium) — recommended').\n"
    "4) If your JSON is invalid, the caller will retry once with stronger instruction; do not add commentary.\n"
)

# Construct the messages the explainer LLM will receive


def build_explainer_messages(tool_args: Dict[str, Any], sim_result: Dict[str, Any]) -> list:
    """
    Returns a list of messages to send to the explainer LLM.
    The 'user' message includes both the original tool args and the sim_result payload.
    """
    content = {
        "context": {"tool": "run_sim", "args": tool_args},
        "result": sim_result
    }
    return [
        {"role": "system", "content": SYSTEM_EXPLAINER},
        {"role": "user", "content": "Here is the run_sim JSON. Produce ONLY the JSON explanation as specified."},
        {"role": "user", "content": json.dumps(content)}
    ]


def _parse_and_validate(raw_text: str) -> Explanation:
    """
    Parse the raw_text as JSON and validate against the Explanation Pydantic model.
    Raises ValueError on JSON parse error or ValidationError on schema mismatch.
    """
    data = json.loads(raw_text)
    return Explanation(**data)


def explain(tool_args: Dict[str, Any], sim_result: Dict[str, Any], cfg: LLMConfig) -> Explanation:
    """
    Call the explainer LLM to convert sim_result into a structured Explanation.
    Returns a validated Explanation Pydantic model instance.
    Retries once with a stricter instruction if the first attempt fails validation.
    """
    client = ChatClient(cfg)
    messages = build_explainer_messages(tool_args, sim_result)

    # First attempt
    resp = client.chat(model=cfg.explainer_model,
                       messages=messages, max_tokens=400, temperature=0.0)
    raw = resp["choices"][0]["message"]["content"]

    try:
        expl = _parse_and_validate(raw)
        return expl
    except (json.JSONDecodeError, ValidationError, ValueError) as e:
        # Log the failing output for debugging
        print("Explainer first attempt failed validation/parsing. Raw output:")
        print(raw)
        # Retry once with a stronger instruction
        messages_retry = messages.copy()
        # Prepend an explicit important line to the system prompt to force JSON-only output
        messages_retry[0] = {
            "role": "system",
            "content": SYSTEM_EXPLAINER + "\nIMPORTANT: OUTPUT MUST BE VALID JSON ONLY. DO NOT INCLUDE ANY TEXT OUTSIDE THE JSON."
        }
        resp2 = client.chat(model=cfg.explainer_model,
                            messages=messages_retry, max_tokens=400, temperature=0.0)
        raw2 = resp2["choices"][0]["message"]["content"]
        try:
            expl2 = _parse_and_validate(raw2)
            return expl2
        except (json.JSONDecodeError, ValidationError, ValueError) as e2:
            # Final failure: raise an informative error
            print("Explainer retry also failed. Raw output (retry):")
            print(raw2)
            raise RuntimeError(
                "Explainer failed to produce valid JSON after retry.") from e2
