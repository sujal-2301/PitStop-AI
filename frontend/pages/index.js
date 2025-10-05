import { useState } from "react";
import axios from "axios";
import Plot from "../components/Plot";
import ComparePanel from "../components/ComparePanel";
import ExplainerCard from "../components/ExplainerCard";
import AgentThinking from "../components/AgentThinking";
import OutcomeBanner from "../components/OutcomeBanner";
import MCPActions from "../components/MCPActions";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

// Helper component for info tooltips
function InfoTooltip({ children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-500 rounded-full hover:bg-blue-600"
      >
        ?
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-xl -top-2 left-6">
          {children}
        </div>
      )}
    </div>
  );
}
export default function Home() {
  const [userText, setUserText] = useState(
    "We are 0.5 seconds ahead at lap 8. Should we pit on lap 12 for hard tires or lap 10 for mediums to extend our lead?"
  );
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [trace, setTrace] = useState(null);
  const [timings, setTimings] = useState(null);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [toolArgs, setToolArgs] = useState(null);
  const [burstConfidence, setBurstConfidence] = useState(null); // High accuracy mode confidence

  // Display mode toggle
  const [advancedMode, setAdvancedMode] = useState(false);

  // Safety Car controls
  const [scEnabled, setScEnabled] = useState(false);
  const [scStart, setScStart] = useState(11);
  const [scEnd, setScEnd] = useState(13);

  async function runPlan() {
    setLoading(true);
    setError(null);
    setSimResult(null);
    setExplanation(null);
    setTrace(null);
    setTimings(null);
    setMeta(null);
    setBurstConfidence(null); // Reset burst confidence on new simulation
    try {
      const url = `${API_BASE}/plan_and_explain`;
      const res = await axios.post(
        url,
        { user_text: userText },
        { timeout: 60000 }
      );
      let simData = res.data.sim_result;

      // Attach SC window to simResult for chart rendering
      if (scEnabled) {
        simData = {
          ...simData,
          sc_window: { start_lap: scStart, end_lap: scEnd },
        };
      }

      setSimResult(simData);
      setExplanation(res.data.explanation);
      setTrace(res.data.trace);
      setTimings(res.data.timings);
      setMeta(res.data.meta);
      setToolArgs(res.data.tool_args);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleConfidenceUpdate(burstData) {
    // Update confidence from burst simulation
    if (burstData && burstData.confidence) {
      setBurstConfidence(burstData);
      // UI will automatically update to show the upgraded confidence with visual indicators
    }
  }

  const presets = [
    {
      label: "🏆 Extend Lead Strategy",
      text: "We are 0.8s ahead at lap 8. Should we pit lap 10 medium or lap 12 hard to maximize our advantage and stay ahead?",
    },
    {
      label: "⚔️ Undercut Attack",
      text: "We are 0.2s behind at lap 10. Can we undercut by pitting lap 12 soft to jump ahead when they pit lap 14?",
    },
    {
      label: "🎯 Defend Lead Strategy",
      text: "We are 1.0s ahead at lap 13. They might undercut us. Pit lap 15 medium to cover or stay out lap 17 hard?",
    },
    {
      label: "⚡ Safety Car Opportunity",
      text: "We are 0.5s ahead at lap 10. Pit lap 12 under Safety Car to extend lead, or risk staying out until lap 15?",
      enableSC: true,
      scStart: 11,
      scEnd: 13,
    },
    {
      label: "🚀 Overcut Strategy",
      text: "We are 0.4s behind at lap 14. Stay out lap 16-17 on fresh tires to overcut when they pit lap 15?",
    },
    {
      label: "💪 Maximize Advantage",
      text: "We are 1.5s ahead at lap 9. Pit lap 11 soft for speed or lap 13 medium for consistency to stay in front?",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold bg-white/20 backdrop-blur rounded-full">
                🏎️ AI-Powered Race Strategy
              </div>
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                PitStop AI
              </h1>
              <p className="text-xl text-blue-100 mb-6 max-w-2xl">
                Your intelligent racing copilot. Ask a question in plain
                English, get instant data-driven pit strategy recommendations.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-2xl">🧠</span>
                  <span>Meta Llama</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-2xl">⚡</span>
                  <span>Cerebras</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-2xl">🐳</span>
                  <span>Docker</span>
                </div>
              </div>
            </div>
            {meta && (
              <div className="hidden lg:block text-sm bg-white/10 backdrop-blur px-6 py-4 rounded-xl">
                <div className="text-blue-200 text-xs mb-2">System Status</div>
                <div className="font-mono text-xs space-y-1">
                  <div>
                    Provider:{" "}
                    <span className="text-green-300">{meta.provider}</span>
                  </div>
                  <div>
                    Model:{" "}
                    <span className="text-green-300">
                      {meta.planner_model?.split("-").slice(0, 4).join("-")}
                    </span>
                  </div>
                  <div>
                    Status: <span className="text-green-300">● Online</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* What This Does - Info Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <span className="text-2xl mr-2">💡</span>
            What does this do?
          </h2>
          <p className="text-gray-700 mb-3">
            In racing, <strong>when you pit (stop to change tires)</strong> and{" "}
            <strong>which tire compound you choose</strong> can win or lose the
            race. PitStop AI simulates different strategies and tells you which
            one gives you the best chance to be ahead of your competitor.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="font-semibold text-blue-900 mb-1">🎯 The Gap</div>
              <div className="text-sm text-gray-700">
                How far ahead or behind you are (in seconds). Negative = you're
                losing.
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="font-semibold text-purple-900 mb-1">
                🛞 Tire Compounds
              </div>
              <div className="text-sm text-gray-700">
                Soft (fast but wear out), Medium (balanced), Hard (slow but last
                longer)
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="font-semibold text-green-900 mb-1">
                📊 Breakeven Lap
              </div>
              <div className="text-sm text-gray-700">
                The lap where your strategy "pays off" and you recover from the
                pit stop time loss
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
        <div>
              <label className="block text-lg font-semibold text-gray-900">
                🎤 Ask Your Strategy Question
              </label>
              <p className="text-sm text-gray-600 mt-1">
                Describe your race situation in plain English. No technical
                jargon needed!
              </p>
            </div>
          </div>

          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            rows={3}
            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
            placeholder="Example: We are 0.5 seconds ahead at lap 10. Should we pit on lap 12 for hard tires or lap 14 for mediums to maximize our lead?"
          />

          {/* Preset buttons */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">
              📋 TRY THESE EXAMPLES:
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setUserText(preset.text);
                    if (preset.enableSC) {
                      setScEnabled(true);
                      setScStart(preset.scStart);
                      setScEnd(preset.scEnd);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Car controls */}
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={scEnabled}
                onChange={(e) => setScEnabled(e.target.checked)}
                className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚨</span>
                <div>
                  <span className="font-semibold text-gray-900">
                    Safety Car Window
                  </span>
                  <InfoTooltip>
                    A Safety Car slows down the race. Pitting during this time
                    costs less because everyone is going slower. This can change
                    which strategy is best!
                  </InfoTooltip>
                  <div className="text-xs text-gray-600">
                    Simulate a race incident that changes strategy
                  </div>
                </div>
              </div>
            </label>
            {scEnabled && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
                <div className="flex gap-4 items-center text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">
                      SC Start Lap:
                    </span>
                    <input
                      type="number"
                      value={scStart}
                      onChange={(e) =>
                        setScStart(parseInt(e.target.value) || 0)
                      }
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      min="1"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-gray-700 font-medium">
                      SC End Lap:
                    </span>
                    <input
                      type="number"
                      value={scEnd}
                      onChange={(e) => setScEnd(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      min="1"
                    />
                  </label>
                  <div className="flex-1 text-xs text-gray-600 bg-yellow-100 px-3 py-2 rounded">
                    💡 Pit stops are <strong>40% faster</strong> during Safety
                    Car periods
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={runPlan}
              disabled={loading}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing Strategies...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="text-2xl">🚀</span>
                  Run Strategy Simulation
                </span>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-800 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold">Error</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-xl p-12 text-center border-2 border-blue-500 text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 animate-pulse">
              <svg
                className="h-10 w-10 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">AI Agent Working...</h3>
            <p className="text-gray-400">
              Analyzing race state, generating strategies, and iterating to
              convergence
            </p>
          </div>
        )}

        {simResult ? (
          <>
            {/* High Accuracy Completion Notification */}
            {burstConfidence && (
              <div className="mb-6 animate-[slideDown_0.5s_ease-out]">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-6 border-l-4 border-yellow-400">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl animate-bounce">
                      ⚡
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        ✅ High Accuracy Mode Complete!
                      </h3>
                      <p className="text-green-50">
                        Confidence upgraded to{" "}
                        <span className="font-bold text-yellow-300">
                          {burstConfidence.confidence.toFixed(1)}%
                        </span>{" "}
                        using 2,000 Monte Carlo samples
                      </p>
                      <p className="text-sm text-green-100 mt-1">
                        📊 Tighter confidence bands calculated for more reliable
                        predictions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Outcome Banner - Always shown first */}
            <OutcomeBanner
              simResult={simResult}
              explanation={explanation}
              burstConfidence={burstConfidence}
            />

            {/* Docker MCP Gateway Actions */}
            {toolArgs && (
              <MCPActions
                toolArgs={toolArgs}
                simResult={simResult}
                explanation={explanation}
                onConfidenceUpdate={handleConfidenceUpdate}
              />
            )}

            {/* Mode Toggle */}
            <div className="flex justify-center my-6">
              <button
                onClick={() => setAdvancedMode(!advancedMode)}
                className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {advancedMode ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  )}
                </svg>
                {advancedMode ? "Hide Technical Details" : "Show How It Works"}
              </button>
            </div>

            {/* Simple Mode - Short rationale only */}
            {!advancedMode && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Why This Strategy Works
                </h3>
                <ul className="space-y-2">
                  {explanation?.rationale?.slice(0, 3).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-blue-500 font-bold mt-1">
                        {idx + 1}.
                      </span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advanced Mode - Full details */}
            {advancedMode && (
              <>
                <AgentThinking trace={trace} timings={timings} meta={meta} />
                <ExplainerCard explanation={explanation} />
                <ComparePanel simResult={simResult} />
            <Plot simResult={simResult} />
              </>
            )}
          </>
        ) : !loading ? (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-12 text-center border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Optimize Your Race Strategy?
            </h3>
            <p className="text-gray-600 mb-4">
              Enter your race situation above and click "Run Strategy
              Simulation"
            </p>
            <p className="text-sm text-gray-500">
              💡 Tip: Try one of the example scenarios to see how it works!
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
