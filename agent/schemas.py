from typing import List, Optional
from pydantic import BaseModel, Field


class DecisionMetrics(BaseModel):
    # {"lap": int, "gap_seconds": float}
    median_gap_by_lap: Optional[dict] = None


class Explanation(BaseModel):
    decision: str = Field(..., description="Short recommendation line")
    rationale: List[str] = Field(..., min_items=1, max_items=3)
    assumptions: List[str] = Field(..., min_items=1)
    risks: List[str] = Field(..., min_items=1)
    fallback: str = Field(...,
                          description="What to do if main plan invalidates")
    metrics: DecisionMetrics | None = None
