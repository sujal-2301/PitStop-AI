// frontend/components/MCPActions.js
import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export default function MCPActions({ toolArgs, simResult, explanation, onConfidenceUpdate }) {
  const [reportLoading, setReportLoading] = useState(false);
  const [burstLoading, setBurstLoading] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [error, setError] = useState(null);

  async function generateReport() {
    setReportLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/mcp/trigger`, {
        action: 'report',
        tool_args: toolArgs,
        sim_result: simResult,
        explanation: explanation
      }, { timeout: 90000 });
      
      if (response.data.status === 'success' && response.data.artifact) {
        // Open report in new tab
        const reportPath = `${window.location.origin}${response.data.artifact.path}`;
        setReportUrl(reportPath);
        window.open(`/reports/${response.data.artifact.filename}`, '_blank');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setReportLoading(false);
    }
  }

  async function runHighAccuracy() {
    setBurstLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/mcp/trigger`, {
        action: 'burst',
        tool_args: toolArgs
      }, { timeout: 180000 });
      
      if (response.data.status === 'success' && response.data.data) {
        // Update confidence in parent
        if (onConfidenceUpdate) {
          onConfidenceUpdate(response.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setBurstLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-4 justify-center">
      {/* Generate Report Button */}
      <button
        onClick={generateReport}
        disabled={reportLoading}
        className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {reportLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating Report via Docker MCP...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>📄 Generate PDF Report</span>
          </>
        )}
      </button>

      {/* High Accuracy Mode Button */}
      <button
        onClick={runHighAccuracy}
        disabled={burstLoading}
        className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {burstLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Running 2000 Samples via Docker MCP...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>⚡ High Accuracy Mode</span>
          </>
        )}
      </button>

      {error && (
        <div className="w-full mt-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-800 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {reportUrl && !reportLoading && (
        <div className="w-full mt-2 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-800 text-sm">
          <strong>✅ Report generated!</strong> Opening in new tab...
        </div>
      )}
    </div>
  );
}

