// frontend/components/AgentThinking.js
import { useState } from "react";

export default function AgentThinking({ trace, timings, meta, burstData }) {
  const [expanded, setExpanded] = useState(true);

  if (!trace) return null;

  const {
    thinking_steps,
    iterations,
    total_simulations,
    total_tokens,
    parsed_constraints,
  } = trace;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-500">
      {/* Header */}
      <div
        className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div>
            <h3 className="text-2xl font-bold">Agent Thinking Process</h3>
            <p className="text-sm text-purple-200">
              {iterations.length} iterations • {total_simulations} simulations •{" "}
              {total_tokens} tokens
            </p>
          </div>
        </div>
        <button className="text-white hover:text-purple-200 transition">
          {expanded ? "▼" : "▶"}
        </button>
      </div>

      {expanded && (
        <div className="p-6 space-y-6">
          {/* Parsed Constraints */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>📋</span> Understood Race State
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-gray-400 text-xs">Current Lap</div>
                <div className="text-xl font-bold text-blue-400">
                  L{parsed_constraints.base_lap}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-gray-400 text-xs">Gap to Competitor</div>
                <div
                  className={`text-xl font-bold ${
                    parsed_constraints.base_target_gap_s >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {parsed_constraints.base_target_gap_s >= 0 ? "+" : ""}
                  {parsed_constraints.base_target_gap_s?.toFixed(2)}s
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-gray-400 text-xs">Current Tires</div>
                <div className="text-xl font-bold text-yellow-400">
                  {parsed_constraints.current_compound?.toUpperCase()}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="text-gray-400 text-xs">Tire Age</div>
                <div className="text-xl font-bold text-purple-400">
                  {parsed_constraints.current_tire_age} laps
                </div>
              </div>
            </div>
            {parsed_constraints.objective && (
              <div className="mt-3 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                <div className="text-xs text-blue-300 mb-1">Objective</div>
                <div className="text-sm font-semibold">
                  {parsed_constraints.objective}
                </div>
              </div>
            )}
          </div>

          {/* Thinking Steps */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>💭</span> Agent Reasoning
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {thinking_steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-500 font-mono text-xs mt-0.5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 bg-gray-900 p-2 rounded border border-gray-700 font-mono text-xs whitespace-pre-wrap">
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Iterations */}
          {iterations.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🔄</span> Iterative Refinement ({iterations.length}{" "}
                rounds)
              </h4>
              <div className="space-y-4">
                {iterations.map((iter, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-900 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-purple-400">
                        Iteration {iter.iteration}
                      </div>
                      <div className="text-xs text-gray-400">
                        {iter.candidates?.length || 0} strategies tested
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(iter.results
                        ? [...iter.results].sort((a, b) => {
                            const ga = Number(
                              a?.median_gap_after_5_laps ?? -Infinity
                            );
                            const gb = Number(
                              b?.median_gap_after_5_laps ?? -Infinity
                            );
                            return gb - ga; // descending: highest (best) first
                          })
                        : []
                      )
                        .slice(0, 4)
                        .map((res, ridx) => {
                          const isTop = ridx === 0;
                          return (
                            <div
                              key={ridx}
                              className={`p-2 rounded border text-xs ${
                                isTop
                                  ? "bg-green-900/20 border-green-600"
                                  : "bg-gray-800 border-gray-600"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">
                                  L{res.candidate?.pit_lap}{" "}
                                  {res.candidate?.compound?.toUpperCase()}
                                </span>
                                {isTop && (
                                  <span className="text-green-400 text-xs">
                                    ✓ Best
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-lg font-bold mt-1 ${
                                  res.median_gap_after_5_laps >= 0
                                    ? "text-green-400"
                                    : "text-orange-400"
                                }`}
                              >
                                {res.median_gap_after_5_laps >= 0 ? "+" : ""}
                                {res.median_gap_after_5_laps?.toFixed(2)}s
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Accuracy refinement (if any) */}
          {burstData && (
            <div className="bg-green-900/20 rounded-xl p-4 border border-green-700">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-300">
                <span>⚡</span> High Accuracy Refinement
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-green-900/40 p-3 rounded-lg border border-green-700">
                  <div className="text-green-300 text-xs">Confidence</div>
                  <div className="text-2xl font-bold text-green-200">
                    {burstData.confidence?.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-green-900/40 p-3 rounded-lg border border-green-700">
                  <div className="text-green-300 text-xs">Samples</div>
                  <div className="text-2xl font-bold text-green-200">
                    {burstData.mc_samples?.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-900/40 p-3 rounded-lg border border-green-700">
                  <div className="text-green-300 text-xs">P10–P90 Range</div>
                  <div className="text-2xl font-bold text-green-200">
                    {(() => {
                      const p10 = burstData.best_candidate?.p10 || 0;
                      const p90 = burstData.best_candidate?.p90 || 0;
                      return Math.abs(p90 - p10).toFixed(2);
                    })()}
                    s
                  </div>
                </div>
              </div>
              {burstData.best_candidate && (
                <div className="mt-3 text-sm text-green-100">
                  Best candidate: L{burstData.best_candidate.pit_lap}{" "}
                  {String(
                    burstData.best_candidate.compound || ""
                  ).toUpperCase()}{" "}
                  • Median after +5 laps:{" "}
                  {burstData.best_candidate.median_gap_after_5_laps >= 0
                    ? "+"
                    : ""}
                  {burstData.best_candidate.median_gap_after_5_laps?.toFixed(2)}
                  s
                </div>
              )}
            </div>
          )}

          {/* Performance Metrics */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>⚡</span> Performance Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs">Provider</div>
                <div className="text-sm font-bold text-cyan-400">
                  {meta?.provider || "N/A"}
                </div>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs">Model</div>
                <div className="text-sm font-bold text-purple-400">
                  {meta?.planner_model?.split("-").slice(0, 3).join("-") ||
                    "N/A"}
                </div>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs">Total Tokens</div>
                <div className="text-sm font-bold text-yellow-400">
                  {total_tokens?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs">Planning Time</div>
                <div className="text-sm font-bold text-green-400">
                  {timings?.planner_s?.toFixed(2)}s
                </div>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs">Total Time</div>
                <div className="text-sm font-bold text-blue-400">
                  {timings?.total_s?.toFixed(2)}s
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
