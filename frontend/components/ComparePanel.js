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
      label: `Lap ${pitLap}`,
      compound: comp,
      median5: m5,
      breakeven,
      pitLap,
    };
  });

  // Best is the *highest* median (closest to being ahead)
  const best = rows.reduce(
    (acc, r) => (acc === null || r.median5 > acc.median5 ? r : acc),
    null
  );

  // Calculate percentage for visual bars (normalize to 0-100 range)
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.median5)));
  const getBarWidth = (val) => {
    return ((Math.abs(val) / maxAbs) * 100).toFixed(1);
  };

  const compoundColors = {
    SOFT: "from-red-500 to-pink-600",
    MEDIUM: "from-yellow-500 to-orange-600",
    HARD: "from-gray-600 to-gray-800",
  };

  const compoundIcons = {
    SOFT: "🔴",
    MEDIUM: "🟡",
    HARD: "⚫",
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 border-t-4 border-gradient-to-r from-green-500 to-blue-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🏁</span>
            Strategy Comparison
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Which pit strategy gives you the best position after 5 laps?
          </p>
        </div>
        <div className="hidden md:block text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
          📊 {rows.length} {rows.length === 1 ? "strategy" : "strategies"}{" "}
          analyzed
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const delta = r.median5 - best.median5;
          const isBest = r.idx === best.idx;
          const isPositive = r.median5 >= 0;

          return (
            <div
              key={r.idx}
              className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                isBest
                  ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg scale-[1.02]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              }`}
            >
              {/* Best badge ribbon */}
              {isBest && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1 rounded-bl-xl font-bold text-sm shadow-lg flex items-center gap-1">
                    <span>🏆</span>
                    <span>BEST STRATEGY</span>
                  </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-4 py-2 bg-gradient-to-r ${
                        compoundColors[r.compound]
                      } text-white rounded-lg font-bold shadow-md`}
                    >
                      <div className="text-2xl text-center">
                        {compoundIcons[r.compound]}
                      </div>
                      <div className="text-xs text-center mt-1">
                        {r.compound}
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        Pit on {r.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        Switch to {r.compound.toLowerCase()} tires
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual gap representation */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">
                      Gap after +5 laps:
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {r.median5.toFixed(2)}s
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className={`absolute h-full ${
                        isPositive
                          ? "bg-gradient-to-r from-green-400 to-green-600"
                          : "bg-gradient-to-r from-red-400 to-red-600"
                      } transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${getBarWidth(r.median5)}%` }}
                    >
                      <span className="text-xs font-bold text-white">
                        {isPositive ? "AHEAD" : "BEHIND"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                    <span>{isPositive ? "✅ Leading" : "⏱️ Catching up"}</span>
                    {!isBest && (
                      <span className="font-medium text-gray-700">
                        {delta.toFixed(2)}s slower than best
                      </span>
                    )}
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="flex gap-3 pt-3 border-t border-gray-200">
                  {r.breakeven && (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg flex-1">
                      <span className="text-xl">📈</span>
                      <div>
                        <div className="text-xs text-gray-600">
                          Breakeven Lap
                        </div>
                        <div className="font-bold text-blue-900">
                          Lap {r.breakeven}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg flex-1">
                    <span className="text-xl">🎯</span>
                    <div>
                      <div className="text-xs text-gray-600">Pit Stop</div>
                      <div className="font-bold text-purple-900">{r.label}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <div className="font-semibold text-blue-900 mb-1">
              How to read this:
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Positive gap (green):</strong> You're ahead of your
                competitor
              </li>
              <li>
                <strong>Negative gap (red):</strong> You're still behind, but
                the bar shows how close you are
              </li>
              <li>
                <strong>Breakeven lap:</strong> When your strategy "pays off"
                and you recover the pit stop time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
