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
