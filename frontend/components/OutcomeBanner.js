// frontend/components/OutcomeBanner.js
import { useState, useEffect } from "react";

export default function OutcomeBanner({ simResult, explanation }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Fade in animation
    if (simResult && explanation) {
      setTimeout(() => setShow(true), 100);
    }
  }, [simResult, explanation]);

  if (!simResult || !explanation) return null;

  // Get best strategy
  const bestIdx = explanation.metrics?.selected_index ?? 0;
  const best = simResult.candidates[bestIdx];
  const allCandidates = simResult.candidates;

  // Calculate metrics
  const pitLap = best.candidate.pit_lap;
  const compound = best.candidate.compound.toUpperCase();
  const finalGap = best.median_gap_after_5_laps;
  const baseGap = simResult.base_target_gap_s;
  const improvement = finalGap - baseGap;

  // Find second best for delta
  const otherCandidates = allCandidates.filter((_, idx) => idx !== bestIdx);
  const secondBest =
    otherCandidates.length > 0
      ? otherCandidates.reduce((a, b) =>
          a.median_gap_after_5_laps > b.median_gap_after_5_laps ? a : b
        )
      : null;
  const deltaVsNext = secondBest
    ? finalGap - secondBest.median_gap_after_5_laps
    : 0;

  // Calculate confidence (based on P10-P90 range tightness)
  const p90 = best.p90_by_lap[best.p90_by_lap.length - 1];
  const p10 = best.p10_by_lap[best.p10_by_lap.length - 1];
  const range = Math.abs(p90 - p10);
  const confidence = Math.max(60, Math.min(95, 95 - range * 3)); // Tighter range = higher confidence

  // Compound emoji
  const compoundEmoji =
    {
      SOFT: "🔴",
      MEDIUM: "🟡",
      HARD: "⚫",
    }[compound] || "⚪";

  // Breakeven info
  const breakeven = best.breakeven_lap;

  return (
    <div
      className={`transition-all duration-700 transform ${
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-2xl overflow-hidden border-4 border-green-600">
        {/* Main Outcome */}
        <div className="p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 backdrop-blur rounded-full p-3">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-green-100 uppercase tracking-wide">
                ✨ AI Recommendation
              </div>
              <div className="text-xs text-green-200 mt-1">
                Powered by Meta Llama + Cerebras
              </div>
            </div>
          </div>

          {/* The Decision */}
          <div className="mb-6">
            <h2 className="text-4xl font-extrabold mb-2 flex items-center gap-3">
              {compoundEmoji} Pit Lap {pitLap} ({compound})
            </h2>
            <p className="text-xl text-green-50">{explanation.decision}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Time Advantage */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-xs text-green-100 mb-1 uppercase tracking-wide">
                Time Advantage
              </div>
              <div
                className={`text-3xl font-bold ${
                  finalGap >= 0 ? "text-white" : "text-yellow-200"
                }`}
              >
                {finalGap >= 0 ? "+" : ""}
                {finalGap.toFixed(2)}s
              </div>
              <div className="text-xs text-green-100 mt-1">
                {finalGap >= 0 ? "You'll be ahead" : "You'll be behind"} by lap{" "}
                {simResult.base_lap + 10}
              </div>
            </div>

            {/* Improvement */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-xs text-green-100 mb-1 uppercase tracking-wide">
                Net Change
              </div>
              <div
                className={`text-3xl font-bold ${
                  improvement >= 0 ? "text-white" : "text-yellow-200"
                }`}
              >
                {improvement >= 0 ? "+" : ""}
                {improvement.toFixed(2)}s
              </div>
              <div className="text-xs text-green-100 mt-1">
                {improvement >= 0 ? "📈 Improved" : "📉 Declined"} from starting
                position
              </div>
            </div>

            {/* Confidence */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-xs text-green-100 mb-1 uppercase tracking-wide">
                Confidence
              </div>
              <div className="text-3xl font-bold text-white">
                {confidence.toFixed(0)}%
              </div>
              <div className="text-xs text-green-100 mt-1">
                Based on {best.assumptions?.mc_samples || 400} simulations
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="flex flex-wrap gap-4 text-sm">
            {deltaVsNext !== 0 && (
              <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20">
                <span className="text-green-100">Beats next best by:</span>
                <span className="font-bold text-white ml-2">
                  +{deltaVsNext.toFixed(2)}s
                </span>
              </div>
            )}
            {breakeven && (
              <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg border border-white/20">
                <span className="text-green-100">Breakeven lap:</span>
                <span className="font-bold text-white ml-2">L{breakeven}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3-Step Timeline */}
        <div className="bg-white/5 backdrop-blur px-8 py-6 border-t border-white/10">
          <div className="text-xs text-green-100 mb-3 uppercase tracking-wide font-semibold">
            📍 How This Strategy Plays Out
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Before */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">
                🏁
              </div>
              <div>
                <div className="text-xs text-green-100">
                  Now (Lap {simResult.base_lap})
                </div>
                <div className="text-lg font-bold text-white">
                  {baseGap >= 0 ? "+" : ""}
                  {baseGap.toFixed(2)}s
                </div>
                <div className="text-xs text-green-200">Starting position</div>
              </div>
            </div>

            {/* Pit */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-2xl">
                🔧
              </div>
              <div>
                <div className="text-xs text-green-100">
                  Pit Stop (Lap {pitLap})
                </div>
                <div className="text-lg font-bold text-white">
                  −{(best.assumptions?.pit_loss_mean || 21).toFixed(1)}s
                </div>
                <div className="text-xs text-green-200">Tire change loss</div>
              </div>
            </div>

            {/* After */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl">
                {finalGap >= 0 ? "🏆" : "⏱️"}
              </div>
              <div>
                <div className="text-xs text-green-100">Result (+5 laps)</div>
                <div
                  className={`text-lg font-bold ${
                    finalGap >= 0 ? "text-white" : "text-yellow-200"
                  }`}
                >
                  {finalGap >= 0 ? "+" : ""}
                  {finalGap.toFixed(2)}s
                </div>
                <div className="text-xs text-green-200">
                  {finalGap >= 0 ? "Ahead" : "Behind"} by lap{" "}
                  {simResult.base_lap + 10}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
