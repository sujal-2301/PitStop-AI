from dataclasses import dataclass
from typing import List, Literal, Dict, Any
import numpy as np
import pandas as pd

Compound = Literal["soft", "medium", "hard"]


@dataclass
class Strategy:
    pit_lap: int
    compound: Compound


@dataclass
class Constraints:
    max_tire_age: int = 22
    must_use_two_compounds: bool = True


@dataclass
class SimConfig:
    pit_loss_mean: float = 21.0   # seconds
    pit_loss_std: float = 0.5
    deg_soft_start: int = 12      # laps before noticeable deg
    deg_soft_per_lap: float = 0.12
    deg_med_start: int = 18
    deg_med_per_lap: float = 0.10
    deg_hard_start: int = 22
    deg_hard_per_lap: float = 0.08
    traffic_penalty_s: float = 0.25  # simple penalty when rejoining behind target car
    mc_samples: int = 200


def _deg_for(compound: Compound, age: int, cfg: SimConfig) -> float:
    if compound == "soft":
        return max(0, age - cfg.deg_soft_start) * cfg.deg_soft_per_lap
    if compound == "medium":
        return max(0, age - cfg.deg_med_start) * cfg.deg_med_per_lap
    return max(0, age - cfg.deg_hard_start) * cfg.deg_hard_per_lap


def simulate(
    df: pd.DataFrame,
    current_compound: Compound,
    current_tire_age: int,
    base_target_gap_s: float,
    base_lap: int,
    candidates: List[Strategy],
    constraints: Constraints | None = None,
    cfg: SimConfig | None = None,
    sc_window: Dict[str, int] | None = None,
    sc_pit_loss_factor: float = 1.0
) -> Dict[str, Any]:
    """
    df: laps table with base_pace_s per lap (clean air). We simulate from base_lap onward.
    base_target_gap_s: positive => you're ahead; negative => you're behind (gap to target car)
    sc_window: Optional dict with 'start_lap' and 'end_lap' for Safety Car period
    sc_pit_loss_factor: Multiplier for pit loss during SC (e.g., 0.6 = 40% faster stop)
    """
    constraints = constraints or Constraints()
    cfg = cfg or SimConfig()

    laps = df[df["lap"] >= base_lap].copy().reset_index(drop=True)
    if laps.empty:
        raise ValueError("No laps to simulate from base_lap.")
    
    # Helper to check if a lap is within SC window
    def is_sc_lap(lap_num: int) -> bool:
        if not sc_window:
            return False
        return sc_window.get("start_lap", 999) <= lap_num <= sc_window.get("end_lap", 0)

    # helper to project lap times for a stint from a given starting tire age and compound
    def project_stint(compound: Compound, start_age: int, num_laps: int, rng: np.random.Generator):
        ages = start_age + np.arange(num_laps)
        degs = np.array([_deg_for(compound, int(a), cfg) for a in ages])
        # ~30ms per lap noise
        noise = rng.normal(loc=0.0, scale=0.03, size=num_laps)
        # Align with base pace from df rows
        base = laps["base_pace_s"].values[:num_laps]
        return base + degs + noise

    # Monte Carlo samples of each candidate
    rng = np.random.default_rng(42)
    results = []

    for cand in candidates:
        # Constraint checks (simple)
        if constraints.max_tire_age and constraints.max_tire_age < 10:
            pass  # trivial example—extend later if needed

        # Build two segments: before pit and after pit (switch to candidate compound)
        # We'll simulate N laps total from base_lap to end of df
        total_laps = len(laps)
        # assume pit happens relative to absolute lap number
        if cand.pit_lap < laps["lap"].iloc[0] or cand.pit_lap > laps["lap"].iloc[-1]:
            # treat as "no pit within window"
            pit_index = None
        else:
            # 0-based index
            pit_index = int(cand.pit_lap - laps["lap"].iloc[0])

        # Monte Carlo
        gaps_by_lap = []
        p50 = []
        p90 = []
        med_gap_at_5 = None

        for _ in range(cfg.mc_samples):
            seeder = rng.integers(0, 1_000_000)
            rg = np.random.default_rng(int(seeder))

            if pit_index is None:
                # stay on current compound entire window
                lt = project_stint(
                    current_compound, current_tire_age, total_laps, rg)
                pit_loss = 0.0
            else:
                before = project_stint(
                    current_compound, current_tire_age, pit_index, rg)
                # pit loss sample - reduced if pitting during SC
                base_pit_loss = rg.normal(cfg.pit_loss_mean, cfg.pit_loss_std)
                if is_sc_lap(cand.pit_lap):
                    pit_loss = base_pit_loss * sc_pit_loss_factor
                else:
                    pit_loss = base_pit_loss
                after = project_stint(
                    cand.compound, 0, total_laps - pit_index, rg)
                lt = np.concatenate([before, after])  # lap times

            # Simple target model: assume target keeps base pace with mild deg on its own medium tires
            target_compound = "medium"
            target_base_age = max(0, current_tire_age - 3)  # rough guess
            target = project_stint(
                target_compound, target_base_age, total_laps, rg)

            # Apply pit loss at the index (gap is “you − target”; negative means you're behind)
            # if target faster, your gap becomes more negative
            gap = np.cumsum(target - lt)
            if pit_index is not None:
                gap[pit_index:] -= pit_loss

            # Start from base_target_gap_s
            gap = gap + base_target_gap_s

            gaps_by_lap.append(gap)

        gaps_by_lap = np.vstack(gaps_by_lap)  # (mc, T)
        p50 = np.median(gaps_by_lap, axis=0)
        p90 = np.percentile(gaps_by_lap, 90, axis=0)
        p10 = np.percentile(gaps_by_lap, 10, axis=0)

        # metric: median gap after 5 laps from pit (or from now if no pit)
        if pit_index is None:
            idx = min(4, len(p50) - 1)
        else:
            idx = min(pit_index + 5, len(p50) - 1)
        med_gap_at_5 = float(p50[idx])

        # Breakeven lap: first lap where median gap returns to pre-pit level
        breakeven_lap = None
        if pit_index is not None and pit_index > 0:
            pre_pit_gap = float(p50[pit_index - 1]) if pit_index > 0 else base_target_gap_s
            for i in range(pit_index, len(p50)):
                if p50[i] >= pre_pit_gap:
                    breakeven_lap = int(laps["lap"].iloc[0] + i)
                    break

        results.append({
            "candidate": {"pit_lap": int(cand.pit_lap), "compound": cand.compound},
            "p50_by_lap": p50.tolist(),
            "p90_by_lap": p90.tolist(),
            "p10_by_lap": p10.tolist(),
            "median_gap_after_5_laps": med_gap_at_5,
            "pit_index": None if pit_index is None else int(pit_index),
            "breakeven_lap": breakeven_lap,
            "assumptions": {
                "pit_loss_mean": cfg.pit_loss_mean,
                "pit_loss_std": cfg.pit_loss_std,
                "deg_soft": f"start={cfg.deg_soft_start}, +{cfg.deg_soft_per_lap:.2f}s/lap",
                "deg_medium": f"start={cfg.deg_med_start}, +{cfg.deg_med_per_lap:.2f}s/lap",
                "deg_hard": f"start={cfg.deg_hard_start}, +{cfg.deg_hard_per_lap:.2f}s/lap",
                "noise_std_per_lap_s": 0.03,
                "sc_active": sc_window is not None,
                "sc_pit_loss_factor": sc_pit_loss_factor if sc_window else None
            }
        })

    return {
        "base_lap": int(base_lap),
        "base_target_gap_s": float(base_target_gap_s),
        "candidates": results
    }
