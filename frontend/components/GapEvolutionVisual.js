// frontend/components/GapEvolutionVisual.js
export default function GapEvolutionVisual({ simResult }) {
  if (!simResult || !simResult.candidates || simResult.candidates.length === 0) {
    return null;
  }

  const baseGap = simResult.base_target_gap_s;
  const baseLap = simResult.base_lap;
  const candidates = simResult.candidates;

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 border-t-4 border-purple-500">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-3xl">🎬</span>
          Visual Race Timeline
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          See how your gap changes lap-by-lap with each strategy
        </p>
      </div>

      {/* Starting Position */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300">
        <div className="text-center">
          <div className="text-sm font-semibold text-blue-900 mb-2">📍 STARTING POSITION (Lap {baseLap})</div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-5xl">🏎️</div>
            <div>
              <div className="text-4xl font-bold text-blue-900">
                {baseGap >= 0 ? '+' : ''}{baseGap.toFixed(2)}s
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {baseGap >= 0 ? '✅ You are AHEAD' : '⏱️ You are BEHIND'}
              </div>
            </div>
            <div className="text-5xl opacity-40">🏎️</div>
          </div>
        </div>
      </div>

      {/* Each Strategy Timeline */}
      <div className="space-y-6">
        {candidates.map((cand, idx) => {
          const pitLap = cand.candidate.pit_lap;
          const compound = cand.candidate.compound.toUpperCase();
          const finalGap = cand.median_gap_after_5_laps;
          const pitIndex = cand.pit_index ?? 0;
          const gapAtPit = pitIndex > 0 ? cand.p50_by_lap[pitIndex - 1] : baseGap;
          const gapAfterPit = pitIndex < cand.p50_by_lap.length ? cand.p50_by_lap[pitIndex] : gapAtPit;
          const pitDrop = gapAfterPit - gapAtPit;

          const compoundColors = {
            SOFT: 'from-red-500 to-pink-600',
            MEDIUM: 'from-yellow-500 to-orange-600',
            HARD: 'from-gray-600 to-gray-800',
          };

          const compoundEmoji = {
            SOFT: '🔴',
            MEDIUM: '🟡',
            HARD: '⚫',
          };

          return (
            <div key={idx} className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className={`px-4 py-2 bg-gradient-to-r ${compoundColors[compound]} text-white rounded-lg font-bold text-sm shadow-md`}>
                  {compoundEmoji[compound]} Strategy {idx + 1}: Pit Lap {pitLap} ({compound})
                </div>
              </div>

              {/* Timeline Visualization */}
              <div className="relative bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl p-6 border-2 border-gray-200">
                {/* Timeline Track */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="relative h-16 bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                      {/* Progress bar showing gap improvement */}
                      <div className="absolute inset-0 flex items-center px-4">
                        <div className="w-full relative">
                          {/* Starting gap */}
                          <div className="absolute left-0 top-0 bottom-0 flex items-center">
                            <div className="text-xs font-bold text-gray-600">
                              L{baseLap}: {baseGap.toFixed(1)}s
                            </div>
                          </div>

                          {/* Pit stop marker */}
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
                            style={{ left: `${((pitLap - baseLap) / (baseLap + 10 - baseLap)) * 100}%` }}
                          >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-bold">
                              🏁 PIT
                            </div>
                          </div>

                          {/* Ending gap */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center">
                            <div className={`text-xs font-bold ${finalGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              +5 laps: {finalGap >= 0 ? '+' : ''}{finalGap.toFixed(1)}s
                            </div>
                          </div>

                          {/* Gradient showing improvement/decline */}
                          <div 
                            className={`absolute inset-0 opacity-20 ${
                              finalGap > baseGap 
                                ? 'bg-gradient-to-r from-gray-300 to-green-400' 
                                : 'bg-gradient-to-r from-gray-300 to-red-400'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Lap markers */}
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Lap {baseLap}</span>
                      <span>Lap {pitLap}</span>
                      <span>Lap {baseLap + 10}</span>
                    </div>
                  </div>
                </div>

                {/* Key Moments */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Before Pit */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Before Pit</div>
                    <div className="text-xl font-bold text-gray-900">
                      {gapAtPit >= 0 ? '+' : ''}{gapAtPit.toFixed(2)}s
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Lap {pitLap - 1}</div>
                  </div>

                  {/* Pit Impact */}
                  <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300">
                    <div className="text-xs text-blue-900 mb-1 font-semibold">🏁 Pit Stop Impact</div>
                    <div className={`text-xl font-bold ${pitDrop < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                      {pitDrop >= 0 ? '+' : ''}{pitDrop.toFixed(2)}s
                    </div>
                    <div className="text-xs text-blue-700 mt-1">Time lost/gained</div>
                  </div>

                  {/* Final Result */}
                  <div className={`rounded-lg p-3 border-2 ${
                    finalGap >= 0 ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
                  }`}>
                    <div className={`text-xs mb-1 font-semibold ${
                      finalGap >= 0 ? 'text-green-900' : 'text-orange-900'
                    }`}>
                      Final Position (+5)
                    </div>
                    <div className={`text-xl font-bold ${
                      finalGap >= 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {finalGap >= 0 ? '+' : ''}{finalGap.toFixed(2)}s
                    </div>
                    <div className={`text-xs mt-1 ${
                      finalGap >= 0 ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {finalGap >= 0 ? '✅ AHEAD' : '⏱️ BEHIND'}
                    </div>
                  </div>
                </div>

                {/* Net Change Indicator */}
                <div className="mt-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    finalGap > baseGap 
                      ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                      : finalGap < baseGap 
                      ? 'bg-red-100 text-red-800 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
                  }`}>
                    {finalGap > baseGap ? '📈' : finalGap < baseGap ? '📉' : '➡️'}
                    <span className="font-bold">
                      Net Change: {(finalGap - baseGap) >= 0 ? '+' : ''}{(finalGap - baseGap).toFixed(2)}s
                    </span>
                    {finalGap > baseGap && <span>🎉 IMPROVED!</span>}
                    {finalGap < baseGap && <span>Lost ground</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-semibold text-gray-900 mb-2">📖 How to Read This:</div>
        <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-700">
          <div className="flex items-start gap-2">
            <span>✅</span>
            <span><strong>Positive numbers (+):</strong> You're ahead of competitor</span>
          </div>
          <div className="flex items-start gap-2">
            <span>⏱️</span>
            <span><strong>Negative numbers (-):</strong> You're behind competitor</span>
          </div>
          <div className="flex items-start gap-2">
            <span>🏁</span>
            <span><strong>Pit marker:</strong> When you stop for tire change</span>
          </div>
          <div className="flex items-start gap-2">
            <span>📈</span>
            <span><strong>Net change:</strong> Total improvement/loss from this strategy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

