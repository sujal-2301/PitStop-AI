import { useState } from "react";
import axios from "axios";
import Plot from "../components/Plot";
import ExplainerCard from "../components/ExplainerCard";

export default function Home() {
  const [userText, setUserText] = useState(
    "We are 1.5 seconds behind at lap 10. Simulate pitting on lap 12 for mediums."
  );
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);

  async function runPlan() {
    setLoading(true);
    setError(null);
    setSimResult(null);
    setExplanation(null);
    try {
      // For now, call the MOCK endpoint so you don't need LLM keys while wiring the UI:
      const url = "http://127.0.0.1:8000/plan_and_explain";
      const res = await axios.post(
        url,
        { user_text: userText },
        { timeout: 30000 }
      );
      setSimResult(res.data.sim_result);
      setExplanation(res.data.explanation);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold">PitStop AI — Demo UI</h1>

        <div>
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            rows={3}
            className="w-full p-3 border rounded"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={runPlan}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? "Running…" : "Run Plan"}
            </button>
            <button
              onClick={() =>
                setUserText(
                  "If we box on lap 12 for medium tyres and we are 1.5s behind, can we undercut within 5 laps?"
                )
              }
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Example
            </button>
          </div>
          {error && <div className="mt-3 text-red-600">Error: {error}</div>}
        </div>

        {simResult ? (
          <>
            <Plot simResult={simResult} />
            <ExplainerCard explanation={explanation} />
          </>
        ) : (
          <div className="text-sm text-gray-600">
            No simulation yet — click “Run Plan”.
          </div>
        )}
      </div>
    </div>
  );
}
