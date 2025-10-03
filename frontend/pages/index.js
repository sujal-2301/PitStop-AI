import { useState } from "react";
import axios from "axios";
import Plot from "../components/Plot";
import ComparePanel from "../components/ComparePanel";
import ExplainerCard from "../components/ExplainerCard";

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
    "We are 1.5 seconds behind at lap 10. Simulate pitting on lap 12 for mediums."
  );
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  // Safety Car controls
  const [scEnabled, setScEnabled] = useState(false);
  const [scStart, setScStart] = useState(11);
  const [scEnd, setScEnd] = useState(13);

  async function runPlan() {
    setLoading(true);
    setError(null);
    setSimResult(null);
    setExplanation(null);
    setMeta(null);
    try {
      const url = `${API_BASE}/plan_and_explain`;
      const res = await axios.post(
        url,
        { user_text: userText },
        { timeout: 30000 }
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
      setMeta(res.data.meta);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  const presets = [
    {
      label: "Undercut (Lap 12 Medium)",
      text: "We are 1.5s behind at lap 10. Simulate pit lap 12 medium and lap 14 hard.",
    },
    {
      label: "Overcut (Lap 16 Hard)",
      text: "We are 0.8s ahead at lap 12. Compare staying out until lap 16 on hard vs pitting lap 14 medium.",
    },
    {
      label: "SC Window Strategy",
      text: "We are 2.0s behind at lap 9. Pit lap 11 medium or lap 15 hard.",
      enableSC: true,
      scStart: 11,
      scEnd: 13,
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
            placeholder="Example: We are 1.5 seconds behind at lap 10. Should we pit on lap 12 for medium tires or wait until lap 14 for hard tires?"
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
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-12 text-center border-2 border-blue-200">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
              <svg
                className="animate-spin h-10 w-10 text-white"
                viewBox="0 0 24 24"
              >
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
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Running Simulation
            </h3>
            <p className="text-gray-600">
              Analyzing pit strategies with AI-powered Monte Carlo simulation...
            </p>
            <div className="mt-6 flex justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <span className="text-gray-600">Simulating</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                <span className="text-gray-600">Analyzing</span>
              </div>
            </div>
          </div>
        )}

        {simResult ? (
          <>
            <Plot simResult={simResult} />
            <ComparePanel simResult={simResult} />
            <ExplainerCard explanation={explanation} />
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
