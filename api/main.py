# api/main.py
from typing import Any, Dict
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from api.schemas import SimRequest, SimResponse
import pandas as pd
from sim.core import simulate, Strategy, SimConfig
from typing import List
import requests
import re
import os
from functools import lru_cache
import json
import time

app = FastAPI(title="PitStop AI — Simulation Service", version="0.1")

# CORS - single configuration
orig = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[orig, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dataframe - loaded once on startup
DF = None


@app.on_event("startup")
def load_race_data():
    """Load CSV once at startup instead of per-request"""
    global DF
    try:
        DF = pd.read_csv("data/synth_race.csv")
        print(f"✓ Loaded race data: {len(DF)} laps")
    except Exception as e:
        print(f"✗ Failed to load race data: {e}")
        DF = None


@app.get("/healthz")
def health():
    """Health check endpoint for Docker and monitoring"""
    return {
        "status": "ok",
        "data_loaded": DF is not None,
        "service": "PitStop AI API"
    }


@lru_cache(maxsize=512)
def _cached_simulate(args_json: str):
    """LRU-cached simulation to avoid recomputing identical requests"""
    args = json.loads(args_json)

    if DF is None:
        raise ValueError("Race data not loaded")

    cfg = SimConfig()
    if args.get("mc_samples"):
        cfg.mc_samples = int(args["mc_samples"])

    candidates = [Strategy(pit_lap=c["pit_lap"], compound=c["compound"])
                  for c in args["candidates"]]

    return simulate(
        df=DF,
        current_compound=args["current_compound"],
        current_tire_age=args["current_tire_age"],
        base_target_gap_s=args["base_target_gap_s"],
        base_lap=args["base_lap"],
        candidates=candidates,
        cfg=cfg,
        sc_window=args.get("sc_window"),
        sc_pit_loss_factor=args.get("sc_pit_loss_factor", 1.0)
    )


@app.post("/run_sim", response_model=SimResponse)
def run_sim(req: SimRequest):
    """
    Run Monte-Carlo pit strategy simulation.
    Now supports Safety Car windows and uses cached results.
    """
    if DF is None:
        raise HTTPException(
            status_code=500,
            detail="Race data not loaded. Check server logs."
        )

    # Build cacheable args dict
    args = {
        "base_lap": req.base_lap,
        "base_target_gap_s": req.base_target_gap_s,
        "current_compound": req.current_compound,
        "current_tire_age": req.current_tire_age,
        "candidates": [{"pit_lap": c.pit_lap, "compound": c.compound} for c in req.candidates],
        "mc_samples": req.mc_samples or 200,
        "sc_window": req.sc_window.dict() if req.sc_window else None,
        "sc_pit_loss_factor": req.sc_pit_loss_factor or 1.0
    }

    args_json = json.dumps(args, sort_keys=True)

    try:
        out = _cached_simulate(args_json)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    return SimResponse(**out)


class PlanRequest(BaseModel):
    user_text: str


@app.post("/plan_and_explain")
def plan_and_explain(req: PlanRequest):
    """
    Orchestrates the iterative planner -> /run_sim -> explainer with full agent trace.
    Falls back to mock mode if LLM key is missing.
    """
    try:
        from agent.config import LLMConfig
        from agent.iterative_planner import IterativePlanner
        from agent.explainer import explain
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Agent modules not available: {e}")

    cfg = LLMConfig()

    # Fallback to mock if no LLM key
    if not cfg.api_key or cfg.api_key == "":
        print("⚠️  No LLM_API_KEY found - using mock mode")
        return plan_and_explain_mock(req)

    t0 = time.perf_counter()
    try:
        planner = IterativePlanner(cfg)
        result = planner.plan_iteratively(req.user_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Planner failed: {e}")
    t1 = time.perf_counter()

    try:
        expl = explain(result["tool_args"], result["sim_result"], cfg)
    except Exception as e:
        # if explainer fails, still return sim_result so the UI isn't blocked
        return {
            "tool_args": result["tool_args"],
            "sim_result": result["sim_result"],
            "trace": result.get("trace"),
            "explanation": None,
            "explainer_error": str(e),
            "timings": {"planner_s": round(t1-t0, 3)}
        }
    t2 = time.perf_counter()

    # Explanation is a Pydantic model; convert to dict
    return {
        "tool_args": result["tool_args"],
        "sim_result": result["sim_result"],
        "trace": result.get("trace"),  # Agent thinking trace
        "explanation": expl.dict(),
        "timings": {
            "planner_s": round(t1-t0, 3),
            "explainer_s": round(t2-t1, 3),
            "total_s": round(t2-t0, 3)
        },
        "meta": {
            "provider": "Cerebras",
            "planner_model": cfg.planner_model,
            "explainer_model": cfg.explainer_model
        }
    }


@app.post("/plan_and_explain_mock")
def plan_and_explain_mock(req: PlanRequest):
    """
    Local mock orchestration for frontend dev (no LLM needed).
    Builds a small run_sim request, calls /run_sim and returns sim + a simple explainer.
    """
    try:
        # simple lap extraction
        base_lap = 10
        m = re.search(r"lap\s+(\d+)", req.user_text, flags=re.IGNORECASE)
        if m:
            base_lap = int(m.group(1))

        args = {
            "base_lap": base_lap,
            "base_target_gap_s": -1.5,
            "current_compound": "soft",
            "current_tire_age": 8,
            "candidates": [{"pit_lap": base_lap + 2, "compound": "medium"}],
            "mc_samples": 100
        }

        # call the run_sim endpoint on the same server
        r = requests.post("http://127.0.0.1:8000/run_sim",
                          json=args, timeout=30)
        r.raise_for_status()
        sim_result = r.json()

        expl = {
            "decision": f"Pit lap {args['candidates'][0]['pit_lap']} (medium) — recommended",
            "rationale": [
                "Fresher tyres after pit yield faster median laps.",
                "Sim shows median gap trending towards improvement within 5 laps."
            ],
            "assumptions": ["pit_loss_mean: 21.0s", "noise std per lap: 0.03s"],
            "risks": ["traffic on rejoin", "safety car before planned pit"],
            "fallback": "If Safety Car occurs before the planned pit, delay the stop by 1 lap",
            "metrics": {
                "median_gap_by_lap": {
                    "lap": min(len(sim_result["candidates"][0]["p50_by_lap"]) - 1, base_lap + 5),
                    "gap_seconds": sim_result["candidates"][0]["median_gap_after_5_laps"]
                }
            }
        }

        return {"tool_args": args, "sim_result": sim_result, "explanation": expl}

    except requests.HTTPError as e:
        raise HTTPException(
            status_code=502, detail=f"run_sim call failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Docker MCP Gateway Endpoints ============

class MCPTriggerRequest(BaseModel):
    action: str  # "report" or "burst"
    tool_args: Dict[str, Any]
    sim_result: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None


@app.post("/mcp/trigger")
def mcp_trigger(req: MCPTriggerRequest):
    """
    Trigger Docker MCP Gateway actions (report generation, burst simulation)
    This demonstrates creative Docker orchestration for on-demand tasks
    """
    import subprocess
    import pathlib
    
    action = req.action.lower()
    
    if action not in ["report", "burst"]:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
    
    try:
        # Write tool_args to artifacts directory
        artifacts_dir = pathlib.Path("./artifacts")
        artifacts_dir.mkdir(exist_ok=True)
        
        tool_args_path = artifacts_dir / "tool_args.json"
        with open(tool_args_path, "w") as f:
            json.dump(req.tool_args, f, indent=2)
        
        # If sim_result and explanation provided, write them too
        if req.sim_result and req.explanation:
            result_data = {
                "sim_result": req.sim_result,
                "explanation": req.explanation
            }
            result_path = artifacts_dir / "sim_result.json"
            with open(result_path, "w") as f:
                json.dump(result_data, f, indent=2)
        
        # Trigger Docker Compose run via MCP
        if action == "report":
            print(f"🐳 MCP: Triggering reporter container...")
            result = subprocess.run(
                ["docker", "compose", "run", "--rm", "reporter"],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                # Read report metadata
                reports_dir = pathlib.Path("./reports")
                meta_path = reports_dir / "latest.json"
                
                if meta_path.exists():
                    with open(meta_path, "r") as f:
                        meta = json.load(f)
                    
                    return {
                        "status": "success",
                        "action": "report",
                        "message": "Report generated successfully",
                        "artifact": {
                            "filename": meta["filename"],
                            "path": f"/reports/{meta['filename']}",
                            "timestamp": meta["timestamp"]
                        },
                        "logs": result.stdout
                    }
                else:
                    return {
                        "status": "success",
                        "action": "report",
                        "message": "Report generated",
                        "logs": result.stdout
                    }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Reporter failed: {result.stderr}"
                )
        
        elif action == "burst":
            print(f"🐳 MCP: Triggering burst simulation container...")
            result = subprocess.run(
                ["docker", "compose", "run", "--rm", "sim-burst"],
                capture_output=True,
                text=True,
                timeout=180
            )
            
            if result.returncode == 0:
                # Read burst result
                burst_path = pathlib.Path("./artifacts/sim_burst.json")
                
                if burst_path.exists():
                    with open(burst_path, "r") as f:
                        burst_data = json.load(f)
                    
                    return {
                        "status": "success",
                        "action": "burst",
                        "message": "High accuracy simulation complete",
                        "data": burst_data,
                        "logs": result.stdout
                    }
                else:
                    return {
                        "status": "success",
                        "action": "burst",
                        "message": "Burst simulation complete",
                        "logs": result.stdout
                    }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Burst simulation failed: {result.stderr}"
                )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"MCP action '{action}' timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"MCP trigger failed: {str(e)}"
        )


@app.get("/mcp/status")
def mcp_status():
    """
    Get Docker container status (demonstrates MCP read operations)
    """
    import subprocess
    
    try:
        # Get container status
        ps_result = subprocess.run(
            ["docker", "compose", "ps", "--format", "json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        containers = []
        if ps_result.returncode == 0 and ps_result.stdout.strip():
            try:
                # Parse JSON lines
                for line in ps_result.stdout.strip().split('\n'):
                    if line.strip():
                        containers.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        
        # Get stats (CPU, memory)
        stats_result = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        stats = []
        if stats_result.returncode == 0 and stats_result.stdout.strip():
            try:
                for line in stats_result.stdout.strip().split('\n'):
                    if line.strip():
                        stats.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        
        return {
            "status": "ok",
            "containers": containers,
            "stats": stats,
            "mcp_enabled": True
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "mcp_enabled": False
        }


@app.get("/mcp/logs/{service}")
def mcp_logs(service: str, tail: int = 50):
    """
    Get container logs (demonstrates MCP observability)
    """
    import subprocess
    
    if service not in ["api", "frontend", "reporter", "sim-burst"]:
        raise HTTPException(status_code=400, detail=f"Invalid service: {service}")
    
    try:
        result = subprocess.run(
            ["docker", "compose", "logs", "--tail", str(tail), service],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        return {
            "service": service,
            "logs": result.stdout,
            "tail": tail
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get logs: {str(e)}"
        )
