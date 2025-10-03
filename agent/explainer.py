# agent/explainer.py
from typing import List, Dict, Any
from pydantic import BaseModel


class Explanation(BaseModel):
    decision: str
    rationale: List[str]
    assumptions: List[str]
    risks: List[str]
    fallback: str
    metrics: Dict[str, Any]


def _safe_float(x, default=None):
    try:
        return float(x)
    except Exception:
        return default


def _best_candidate_index(sim_result: Dict[str, Any]) -> int:
    """
    Choose the strategy that maximizes median_gap_after_5_laps
    (i.e., least negative / most positive = best).
    """
    cands = sim_result.get("candidates", [])
    if not cands:
        return 0
    return max(
        range(len(cands)),
        key=lambda i: _safe_float(cands[i].get(
            "median_gap_after_5_laps"), float("-inf")),
    )


def _label(cand: Dict[str, Any]) -> str:
    pit = cand.get("candidate", {}).get("pit_lap")
    comp = str(cand.get("candidate", {}).get("compound", "")).lower()
    return f"Pit lap {pit} ({comp})"


def explain(tool_args: Dict[str, Any], sim_result: Dict[str, Any], cfg=None) -> Explanation:
    """
    Produce a concise, deterministic explanation without LLM dependency.
    - Picks best candidate by highest median_gap_after_5_laps.
    - Summarizes the comparison and key assumptions/risks.
    """
    cands = sim_result.get("candidates", [])
    if not cands:
        # Shouldn't happen, but guard for safety
        return Explanation(
            decision="No strategy found",
            rationale=["Simulation returned no candidates."],
            assumptions=[],
            risks=[],
            fallback="Retry with at least one candidate.",
            metrics={}
        )

    best_idx = _best_candidate_index(sim_result)
    best = cands[best_idx]
    best_label = _label(best)
    best_m5 = _safe_float(best.get("median_gap_after_5_laps"), 0.0)

    # Build comparison lines against all other candidates
    deltas: List[str] = []
    for i, c in enumerate(cands):
        if i == best_idx:
            continue
        lab = _label(c)
        m5 = _safe_float(c.get("median_gap_after_5_laps"), 0.0)
        delta = best_m5 - m5  # positive means best is better by +delta seconds
        deltas.append(f"{best_label} beats {lab} by {delta:+.2f}s at +5 laps")

    # Assumptions (read from any candidate; they should be identical)
    assumptions_src = (best.get("assumptions") or {})
    assumptions_lines = [
        f"pit_loss_mean = {assumptions_src.get('pit_loss_mean', '21.0')}",
        f"pit_loss_std = {assumptions_src.get('pit_loss_std', '0.5')}",
        f"deg_soft = {assumptions_src.get('deg_soft', 'start=12, +0.12s/lap')}",
        f"deg_medium = {assumptions_src.get('deg_medium', 'start=18, +0.10s/lap')}",
        f"deg_hard = {assumptions_src.get('deg_hard', 'start=22, +0.08s/lap')}",
        f"noise_std_per_lap_s = {assumptions_src.get('noise_std_per_lap_s', '0.03')}",
    ]

    # Core rationale lines
    rationale: List[str] = [
        f"Median gap @ +5 laps for {best_label}: {best_m5:.2f}s (higher is better)."]
    # Also list each candidate's m5 for transparency
    for c in cands:
        lab = _label(c)
        m5 = _safe_float(c.get("median_gap_after_5_laps"), 0.0)
        rationale.append(f"{lab}: {m5:.2f}s @ +5 laps")
    rationale += deltas

    # Simple risk/fallback set
    risks = [
        "Traffic on rejoin could reduce the expected gains",
        "Safety Car before/after the stop may invalidate projections",
    ]
    fallback = (
        "If a Safety Car appears before the planned stop, prefer to box under SC "
        "(reduced pit-loss) provided stint length/compound rules are satisfied; "
        "otherwise reassess on green. If heavy traffic on rejoin is likely, consider "
        "offsetting by ±1 lap once racing resumes."
    )

    # Metrics block mirrors what the UI uses
    metrics = {
        "median_gap_by_lap": {"lap": 5, "gap_seconds": best_m5},
        "selected_index": best_idx,
    }

    return Explanation(
        decision=f"{best_label} — recommended",
        rationale=rationale,
        assumptions=assumptions_lines,
        risks=risks,
        fallback=fallback,
        metrics=metrics,
    )
