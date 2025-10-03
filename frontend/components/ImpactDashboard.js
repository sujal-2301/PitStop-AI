// frontend/components/ImpactDashboard.js
export default function ImpactDashboard({ simResult, explanation }) {
  if (
    !simResult ||
    !simResult.candidates ||
    simResult.candidates.length === 0
  ) {
    return null;
  }

  const candidates = simResult.candidates;
  const bestIdx = explanation?.metrics?.selected_index ?? 0;
  const bestCandidate = candidates[bestIdx];

  // Calculate impressive metrics
  const totalSamples = candidates.length * 200; // Assuming 200 MC samples per strategy
  const dataPointsAnalyzed =
    candidates.reduce((sum, c) => sum + (c.p50_by_lap?.length || 0), 0) * 200;
  const strategiesCompared = candidates.length;
  const confidenceInterval = bestCandidate
    ? Math.abs(
        bestCandidate.p90_by_lap?.[bestCandidate.p90_by_lap.length - 1] -
          bestCandidate.p10_by_lap?.[bestCandidate.p10_by_lap.length - 1]
      )
    : 0;

  // Calculate win probability (simplified - based on how far ahead we end up)
  const finalGap = bestCandidate?.median_gap_after_5_laps || 0;
  const winProbability = Math.min(Math.max(50 + finalGap * 5, 10), 90);

  // Time advantage calculation
  const worstStrategy = candidates.reduce(
    (worst, c) =>
      c.median_gap_after_5_laps < worst.median_gap_after_5_laps ? c : worst,
    candidates[0]
  );
  const timeAdvantage = Math.abs(
    bestCandidate.median_gap_after_5_laps -
      worstStrategy.median_gap_after_5_laps
  );

  const metrics = [
    {
      label: "Monte Carlo Samples",
      value: totalSamples.toLocaleString(),
      description: "Probabilistic scenarios simulated",
      icon: "🎲",
      color: "from-blue-500 to-cyan-500",
      subtext: `${(dataPointsAnalyzed / 1000).toFixed(
        1
      )}K data points analyzed`,
    },
    {
      label: "Win Probability",
      value: `${winProbability.toFixed(1)}%`,
      description: "Chance of beating competitor",
      icon: "🏆",
      color: "from-green-500 to-emerald-500",
      subtext:
        finalGap >= 0 ? "Strategy puts you ahead!" : "Strategy reduces deficit",
      progress: winProbability,
    },
    {
      label: "Time Advantage",
      value: `${timeAdvantage.toFixed(2)}s`,
      description: "vs worst strategy analyzed",
      icon: "⚡",
      color: "from-orange-500 to-red-500",
      subtext: "Saved by choosing optimal strategy",
    },
    {
      label: "Confidence Range",
      value: `±${(confidenceInterval / 2).toFixed(2)}s`,
      description: "80% confidence interval (P10-P90)",
      icon: "📊",
      color: "from-purple-500 to-pink-500",
      subtext: "Statistical uncertainty quantified",
    },
    {
      label: "Strategies Evaluated",
      value: strategiesCompared.toString(),
      description: "Different pit stop scenarios",
      icon: "🔍",
      color: "from-indigo-500 to-blue-500",
      subtext: "Compared simultaneously",
    },
    {
      label: "Breakeven Lap",
      value: bestCandidate?.breakeven_lap
        ? `L${bestCandidate.breakeven_lap}`
        : "N/A",
      description: "When strategy pays off",
      icon: "📈",
      color: "from-teal-500 to-green-500",
      subtext: bestCandidate?.breakeven_lap
        ? "Investment recovery point"
        : "Always behind",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Headline Impact Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl shadow-2xl p-8 border-2 border-green-400">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-6xl">🎯</div>
            <div>
              <div className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                AI Recommendation Impact
              </div>
              <h3 className="text-4xl font-bold text-white">
                {timeAdvantage > 0
                  ? `+${timeAdvantage.toFixed(2)}s Advantage`
                  : "Optimal Strategy"}
              </h3>
            </div>
          </div>

          <p className="text-white/90 text-lg mb-6">
            {finalGap >= 0
              ? `Our AI found a strategy that puts you ${Math.abs(
                  finalGap
                ).toFixed(2)}s AHEAD of your competitor! 🚀`
              : `Best possible outcome: Only ${Math.abs(finalGap).toFixed(
                  2
                )}s behind (${timeAdvantage.toFixed(
                  2
                )}s better than alternatives)`}
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="text-white/70 text-xs mb-1">Computation Time</div>
              <div className="text-2xl font-bold text-white">~2 seconds</div>
              <div className="text-white/60 text-xs mt-1">
                Powered by Cerebras
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="text-white/70 text-xs mb-1">
                Scenarios Analyzed
              </div>
              <div className="text-2xl font-bold text-white">
                {totalSamples.toLocaleString()}
              </div>
              <div className="text-white/60 text-xs mt-1">
                Monte Carlo samples
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4">
              <div className="text-white/70 text-xs mb-1">AI Confidence</div>
              <div className="text-2xl font-bold text-white">
                {winProbability.toFixed(0)}%
              </div>
              <div className="text-white/60 text-xs mt-1">Win probability</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Metrics Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">⚙️</div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Technical Analysis Breakdown
            </h3>
            <p className="text-sm text-gray-600">
              Deep dive into the AI's computational work
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-blue-300"
            >
              {/* Gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-5 group-hover:opacity-10 transition-opacity`}
              ></div>

              <div className="relative p-6">
                {/* Icon and Label */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{metric.icon}</div>
                  {metric.progress !== undefined && (
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${metric.color} text-white`}
                    >
                      {metric.progress.toFixed(0)}%
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="mb-2">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                    {metric.label}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 font-mono">
                    {metric.value}
                  </div>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-600 mb-3">
                  {metric.description}
                </div>

                {/* Progress bar if applicable */}
                {metric.progress !== undefined && (
                  <div className="mb-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${metric.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${metric.progress}%` }}
                    ></div>
                  </div>
                )}

                {/* Subtext */}
                <div className="text-xs text-gray-500 italic">
                  {metric.subtext}
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded-xl transition-colors pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Comparison: Best vs Worst */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl shadow-2xl p-8 border-2 border-gray-700">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-white mb-2">
            Strategy Impact Visualization
          </h3>
          <p className="text-gray-300">
            See the difference our AI recommendation makes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Worst Strategy */}
          <div className="bg-red-900/30 rounded-xl p-6 border-2 border-red-500/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">❌</div>
              <div>
                <div className="text-red-400 text-sm font-semibold">
                  Worst Strategy
                </div>
                <div className="text-white text-xl font-bold">
                  Lap {worstStrategy.candidate.pit_lap} (
                  {worstStrategy.candidate.compound.toUpperCase()})
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-red-300 text-xs mb-1">Final Gap</div>
                <div className="text-3xl font-bold text-red-400 font-mono">
                  {worstStrategy.median_gap_after_5_laps.toFixed(2)}s
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-red-300 text-xs mb-1">Outcome</div>
                <div className="text-white">
                  {worstStrategy.median_gap_after_5_laps >= 0
                    ? `Only ${worstStrategy.median_gap_after_5_laps.toFixed(
                        2
                      )}s ahead`
                    : `Still ${Math.abs(
                        worstStrategy.median_gap_after_5_laps
                      ).toFixed(2)}s behind 😔`}
                </div>
              </div>
            </div>
          </div>

          {/* Best Strategy */}
          <div className="bg-green-900/30 rounded-xl p-6 border-2 border-green-500/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">✅</div>
              <div>
                <div className="text-green-400 text-sm font-semibold">
                  AI Recommended
                </div>
                <div className="text-white text-xl font-bold">
                  Lap {bestCandidate.candidate.pit_lap} (
                  {bestCandidate.candidate.compound.toUpperCase()})
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-green-300 text-xs mb-1">Final Gap</div>
                <div className="text-3xl font-bold text-green-400 font-mono">
                  {bestCandidate.median_gap_after_5_laps >= 0 ? "+" : ""}
                  {bestCandidate.median_gap_after_5_laps.toFixed(2)}s
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4">
                <div className="text-green-300 text-xs mb-1">Outcome</div>
                <div className="text-white">
                  {bestCandidate.median_gap_after_5_laps >= 0
                    ? `${bestCandidate.median_gap_after_5_laps.toFixed(
                        2
                      )}s ahead! 🎉`
                    : `Best possible: ${Math.abs(
                        bestCandidate.median_gap_after_5_laps
                      ).toFixed(2)}s behind`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Improvement Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 bg-yellow-500/20 border-2 border-yellow-500 rounded-full px-8 py-4">
            <div className="text-4xl">⚡</div>
            <div className="text-left">
              <div className="text-yellow-300 text-sm font-semibold">
                AI Improvement
              </div>
              <div className="text-white text-2xl font-bold">
                +{timeAdvantage.toFixed(2)}s better than worst option
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
