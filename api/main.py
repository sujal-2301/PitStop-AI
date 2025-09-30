# api/main.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from api.schemas import SimRequest, SimResponse
import pandas as pd
from sim.core import simulate, Strategy, SimConfig
from typing import List
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
