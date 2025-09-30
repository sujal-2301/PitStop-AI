import pandas as pd
import matplotlib.pyplot as plt
from sim.core import simulate, Strategy

df = pd.read_csv("data/synth_race.csv")
out = simulate(
    df=df,
    current_compound="soft",
    current_tire_age=8,
    base_target_gap_s=-1.5,
    base_lap=10,
    candidates=[Strategy(pit_lap=12, compound="medium")]
)

cand = out["candidates"][0]
p50 = cand["p50_by_lap"]
p10 = cand["p10_by_lap"]
p90 = cand["p90_by_lap"]

plt.figure()
plt.title("Projected Gap vs Laps (median with 10–90%)")
plt.plot(p50, label="median")
plt.fill_between(range(len(p50)), p10, p90, alpha=0.2)
plt.axhline(0.0, linestyle="--")
plt.legend()
plt.xlabel("Lap index from base_lap")
plt.ylabel("Gap to target (s) — positive = you ahead")
plt.show()
