// frontend/components/MCPActions.js
import { useState } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function MCPActions({
  toolArgs,
  simResult,
  explanation,
  onConfidenceUpdate,
}) {
  const [reportLoading, setReportLoading] = useState(false);
  const [burstLoading, setBurstLoading] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [error, setError] = useState(null);

  // Docker MCP status tracking
  const [mcpStatus, setMcpStatus] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [burstData, setBurstData] = useState(null);

  function addStatus(message, type = "info") {
    setMcpStatus((prev) => [
      ...prev,
      { message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  }

  async function generateReport() {
    setReportLoading(true);
    setError(null);
    setMcpStatus([]);
    setShowDetails(true);

    addStatus("🐳 Docker MCP Gateway: Initiating report generation...");
    addStatus("📝 Writing simulation data to artifacts/sim_result.json...");

    try {
      const response = await axios.post(
        `${API_BASE}/mcp/trigger`,
        {
          action: "report",
          tool_args: toolArgs,
          sim_result: simResult,
          explanation: explanation,
        },
        { timeout: 90000 }
      );

      addStatus("✅ Docker container orchestration complete!");
      addStatus(
        `📄 Report generated: ${
          response.data.artifact?.filename || "report.pdf"
        }`,
        "success"
      );

      if (response.data.status === "success" && response.data.artifact) {
        const reportUrl = `${API_BASE}/reports/${response.data.artifact.filename}`;
        setReportUrl(reportUrl);
        window.open(reportUrl, "_blank");
      }
    } catch (err) {
      addStatus(
        `❌ Error: ${err.response?.data?.detail || err.message}`,
        "error"
      );
      setError(err.response?.data?.detail || err.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function runHighAccuracy() {
    setBurstLoading(true);
    setError(null);
    setMcpStatus([]);
    setShowDetails(true);
    setBurstData(null);

    addStatus(
      "🐳 Docker MCP Gateway: Initiating high-accuracy burst simulation..."
    );
    addStatus("📦 Spawning ephemeral Docker container: sim-burst...");
    addStatus(
      "🔧 Container using image: pitstopai-api:latest (with all dependencies)"
    );
    addStatus(
      "📊 Configuring Monte Carlo simulation: 2000 samples (5x standard)..."
    );

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${API_BASE}/mcp/trigger`,
        {
          action: "burst",
          tool_args: toolArgs,
        },
        { timeout: 180000 }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      addStatus("✅ Docker container executed successfully!");
      addStatus(`⏱️ Total execution time: ${duration}s`);

      if (response.data.status === "success" && response.data.data) {
        setBurstData(response.data.data);

        const p10 = response.data.data.best_candidate?.p10 || 0;
        const p90 = response.data.data.best_candidate?.p90 || 0;
        const range = Math.abs(p90 - p10);

        addStatus(
          `📈 Confidence upgraded: ${response.data.data.confidence.toFixed(
            1
          )}%`,
          "success"
        );
        addStatus(
          `🎯 P10-P90 range tightened: ${range.toFixed(2)}s`,
          "success"
        );
        addStatus(
          `🧮 Processed ${response.data.data.mc_samples.toLocaleString()} Monte Carlo samples`,
          "success"
        );

        // Update confidence in parent
        if (onConfidenceUpdate) {
          onConfidenceUpdate(response.data.data);
        }
      }
    } catch (err) {
      addStatus(
        `❌ Container execution failed: ${
          err.response?.data?.detail || err.message
        }`,
        "error"
      );
      setError(err.response?.data?.detail || err.message);
    } finally {
      setBurstLoading(false);
      addStatus("🧹 Ephemeral container removed (--rm flag)");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 my-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🐳</span> Docker MCP Gateway
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Dynamic container orchestration for advanced AI tasks
          </p>
        </div>
        {mcpStatus.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
          >
            {showDetails ? "Hide" : "Show"} Details
            <svg
              className={`w-4 h-4 transition-transform ${
                showDetails ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Docker MCP Status Log */}
      {showDetails && mcpStatus.length > 0 && (
        <div className="mb-4 bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-64">
          {mcpStatus.map((status, idx) => (
            <div
              key={idx}
              className={`mb-1 ${
                status.type === "success"
                  ? "text-green-400"
                  : status.type === "error"
                  ? "text-red-400"
                  : "text-gray-300"
              }`}
            >
              <span className="text-gray-500">[{status.timestamp}]</span>{" "}
              {status.message}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {/* Generate Report Button */}
        <button
          onClick={generateReport}
          disabled={reportLoading || burstLoading}
          className="flex-1 min-w-[200px] relative inline-flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {reportLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Orchestrating...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>📄 Generate PDF Report</span>
            </>
          )}
        </button>

        {/* High Accuracy Mode Button */}
        <button
          onClick={runHighAccuracy}
          disabled={burstLoading || reportLoading}
          className="flex-1 min-w-[200px] relative inline-flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {burstLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Computing 2000 samples...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>⚡ High Accuracy Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Burst Data Summary */}
      {burstData && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-semibold">
              Samples Processed
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {burstData.mc_samples.toLocaleString()}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-xs text-green-600 font-semibold">
              Confidence
            </div>
            <div className="text-2xl font-bold text-green-900">
              {burstData.confidence.toFixed(1)}%
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-semibold">
              P10-P90 Range
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {(() => {
                const p10 = burstData.best_candidate?.p10 || 0;
                const p90 = burstData.best_candidate?.p90 || 0;
                return Math.abs(p90 - p10).toFixed(2);
              })()}
              s
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-800 text-sm">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {reportUrl && !reportLoading && (
        <div className="mt-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-800 text-sm">
          <strong>✅ Report generated!</strong> Opening in new tab...
        </div>
      )}
    </div>
  );
}
