// frontend/components/ComparePanel.js
export default function ComparePanel({ simResult }) {
  const cands = simResult?.candidates || [];
  if (!cands.length) return null;

  // Collect metrics
  const rows = cands.map((c, idx) => {
    const pitLap = c.candidate?.pit_lap;
    const comp = String(c.candidate?.compound || "").toUpperCase();
    const m5 = c.median_gap_after_5_laps; // negative = still behind
    const breakeven = c.breakeven_lap;
    return {
      idx,
      label: `Pit ${pitLap} • ${comp}`,
      median5: m5,
      breakeven,
    };
  });

  // Best is the *highest* median (closest to being ahead)
  const best = rows.reduce(
    (acc, r) => (acc === null || r.median5 > acc.median5 ? r : acc),
    null
  );
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-3">
        Strategy Comparison (+5 laps)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => {
          const delta = r.median5 - best.median5; // <= 0 if this is worse than best
          const isBest = r.idx === best.idx;
          return (
            <div
              key={r.idx}
              className={`border rounded p-3 ${
                isBest ? "border-green-500 bg-green-50" : "border-gray-200"
              }`}
            >
              <div className="font-medium">{r.label}</div>
              <div className="text-sm text-gray-600">Median gap @ +5 laps</div>
              <div className="text-xl">{r.median5.toFixed(2)} s</div>
              {r.breakeven && (
                <div className="text-sm text-blue-600 mt-1">
                  Breakeven: Lap {r.breakeven}
                </div>
              )}
              {!isBest && (
                <div className="text-sm mt-1">
                  Δ vs best:{" "}
                  <span className="font-medium">{delta.toFixed(2)} s</span>
                </div>
              )}
              {isBest && (
                <div className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded mt-1">
                  ✓ Best
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Note: negative gap means still behind; higher (less negative / positive)
        is better.
      </div>
    </div>
  );
}
