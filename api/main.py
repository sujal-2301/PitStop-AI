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

# in api/main.py

app = FastAPI(title="PitStop AI — Simulation Service", version="0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_methods=["*"],
    allow_headers=["*"],
)

# Small in-memory cache for repeated calls in demo (simple dict)
_CACHE = {}


@app.post("/run_sim", response_model=SimResponse)
def run_sim(req: SimRequest):
    # Basic anti-abuse / size checks already in schema (max 6 candidates)
    # Load the seed dataset (for the hackathon demo). You can later replace with a DB or upload.
    try:
        df = pd.read_csv("data/synth_race.csv")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Could not load race data: {e}")

    # Optionally override MC samples in SimConfig
    cfg = SimConfig()
    if req.mc_samples:
        cfg.mc_samples = int(req.mc_samples)

    # Build candidates for simulate()
    candidates = [Strategy(pit_lap=c.pit_lap, compound=c.compound)
                  for c in req.candidates]

    # Simple cache key (stringified)
    cache_key = f"{req.base_lap}-{req.base_target_gap_s}-{req.current_compound}-{req.current_tire_age}-{[(c.pit_lap,c.compound) for c in req.candidates]}-{cfg.mc_samples}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    try:
        out = simulate(
            df=df,
            current_compound=req.current_compound,
            current_tire_age=req.current_tire_age,
            base_target_gap_s=req.base_target_gap_s,
            base_lap=req.base_lap,
            candidates=candidates,
            cfg=cfg
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")

    # Cast response to Pydantic model (SimResponse will validate types)
    resp = SimResponse(**out)
    _CACHE[cache_key] = resp
    return resp

# api/main.py  <-- append or merge with existing file


# ensure CORS so Next.js dev server can call it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # dev UI. Use ["*"] for quick dev
    allow_methods=["*"],
    allow_headers=["*"],
)

# If app already exists above, skip creating a second FastAPI instance.
# The following assumes `app` is already created in this file earlier.


class PlanRequest(BaseModel):
    user_text: str


@app.post("/plan_and_explain")
def plan_and_explain(req: PlanRequest):
    """
    Orchestrates the planner -> /run_sim -> explainer.
    Uses agent.planner.plan_and_run and agent.explainer.explain.
    """
    try:
        # Lazy import to avoid import cycles during tests
        from agent.config import LLMConfig
        from agent.planner import plan_and_run
        from agent.explainer import explain
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Agent modules not available: {e}")

    cfg = LLMConfig()
    try:
        plan = plan_and_run(req.user_text, cfg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Planner failed: {e}")

    try:
        expl = explain(plan["tool_args"], plan["sim_result"], cfg)
    except Exception as e:
        # if explainer fails, still return sim_result so the UI isn't blocked
        return {"tool_args": plan["tool_args"], "sim_result": plan["sim_result"], "explanation": None, "explainer_error": str(e)}

    # Explanation is a Pydantic model; convert to dict
    return {"tool_args": plan["tool_args"], "sim_result": plan["sim_result"], "explanation": expl.dict()}


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
