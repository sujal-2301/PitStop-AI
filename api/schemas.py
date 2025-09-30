# api/schemas.py
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Compound = Literal["soft", "medium", "hard"]


class Candidate(BaseModel):
    pit_lap: int = Field(..., ge=1,
                         description="Absolute lap number to pit on")
    compound: Compound


class SimRequest(BaseModel):
    base_lap: int = Field(..., ge=1,
                          description="Starting absolute lap for simulation window")
    base_target_gap_s: float = Field(...,
                                     description="Your gap to target (positive = ahead)")
    current_compound: Compound
    current_tire_age: int = Field(..., ge=0,
                                  description="Age of current tires in laps")
    candidates: List[Candidate] = Field(..., min_items=1, max_items=6,
                                        description="Candidate strategies to evaluate")
    mc_samples: Optional[int] = Field(
        None, ge=10, le=2000, description="Optional override for Monte Carlo samples")


class CandidateResult(BaseModel):
    candidate: Candidate
    p50_by_lap: List[float]
    p90_by_lap: List[float]
    p10_by_lap: List[float]
    median_gap_after_5_laps: float
    pit_index: Optional[int]
    assumptions: dict


class SimResponse(BaseModel):
    base_lap: int
    base_target_gap_s: float
    candidates: List[CandidateResult]
