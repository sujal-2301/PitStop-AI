import { useState } from "react";
import axios from "axios";
import Plot from "../components/Plot";
import ComparePanel from "../components/ComparePanel";
import ExplainerCard from "../components/ExplainerCard";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
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
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with sponsor attribution */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold">PitStop AI</h1>
            <p className="text-sm text-gray-600 mt-1">
              Race Strategy Copilot — powered by{" "}
              <span className="font-medium text-blue-600">Meta Llama</span> •{" "}
              <span className="font-medium text-purple-600">Cerebras</span> •{" "}
              <span className="font-medium text-cyan-600">Docker</span>
            </p>
          </div>
          {meta && (
            <div className="text-xs text-gray-500 text-right">
              <div>Provider: {meta.provider}</div>
              <div>
                Planner: {meta.planner_model?.split("-").slice(0, 3).join("-")}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Strategy Request
          </label>
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your race situation and pit options..."
          />

          {/* Preset buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
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
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Safety Car controls */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scEnabled}
                onChange={(e) => setScEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-medium text-sm">
                Enable Safety Car Window
              </span>
            </label>
            {scEnabled && (
              <div className="mt-2 flex gap-3 items-center text-sm">
                <label>
                  Start Lap:
                  <input
                    type="number"
                    value={scStart}
                    onChange={(e) => setScStart(parseInt(e.target.value) || 0)}
                    className="ml-2 w-16 px-2 py-1 border rounded"
                    min="1"
                  />
                </label>
                <label>
                  End Lap:
                  <input
                    type="number"
                    value={scEnd}
                    onChange={(e) => setScEnd(parseInt(e.target.value) || 0)}
                    className="ml-2 w-16 px-2 py-1 border rounded"
                    min="1"
                  />
                </label>
                <span className="text-xs text-gray-600">
                  (Pit loss reduced by 40% during SC)
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={runPlan}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
            >
              {loading ? "Running…" : "Run Plan"}
            </button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-white p-8 rounded shadow text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600">Running simulation...</p>
          </div>
        )}

        {simResult ? (
          <>
            <Plot simResult={simResult} />
            <ComparePanel simResult={simResult} />
            <ExplainerCard explanation={explanation} />
          </>
        ) : !loading ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-600">
            <p>
              No simulation yet — enter your strategy request and click "Run
              Plan".
            </p>
            <p className="text-sm mt-2">
              Try one of the preset scenarios above to get started.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
