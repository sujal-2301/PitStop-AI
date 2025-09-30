import pandas as pd
from sim.core import simulate, Strategy


def test_sim_runs():
    df = pd.read_csv("data/synth_race.csv")
    out = simulate(
        df=df,
        current_compound="soft",
        current_tire_age=8,
        base_target_gap_s=-1.5,   # you're 1.5s behind
        base_lap=10,
        candidates=[
            Strategy(pit_lap=12, compound="medium"),
            Strategy(pit_lap=14, compound="hard")
        ]
    )
    assert "candidates" in out and len(out["candidates"]) == 2
    # should give medians
    for c in out["candidates"]:
        assert "median_gap_after_5_laps" in c
