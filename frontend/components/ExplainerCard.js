export default function ExplainerCard({ explanation }) {
  if (!explanation)
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-8 text-center border-2 border-dashed border-gray-300">
        <div className="text-5xl mb-3">🤔</div>
        <div className="text-gray-600">
          AI explanation not available for this simulation.
        </div>
      </div>
    );

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-xl p-6 border-t-4 border-indigo-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <span className="text-3xl">🧠</span>
          AI Recommendation
        </h2>
        <p className="text-sm text-gray-600">
          Our AI analyzed the simulation results and explains the best strategy
          in plain language
        </p>
      </div>

      {/* Main Decision */}
      <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-l-4 border-green-500">
        <div className="flex items-start gap-3">
          <div className="text-4xl">✅</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
              Recommended Strategy
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {explanation.decision}
            </div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      {explanation.rationale && explanation.rationale.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Why This Strategy?
          </h3>
          <div className="space-y-3">
            {explanation.rationale.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="text-gray-800">{r}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & Assumptions Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Risks */}
        {explanation.risks && explanation.risks.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Risks to Watch
            </h3>
            <ul className="space-y-2">
              {explanation.risks.map((risk, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-red-500 mt-1">▸</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Assumptions */}
        {explanation.assumptions && explanation.assumptions.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              Simulation Assumptions
            </h3>
            <ul className="space-y-2">
              {explanation.assumptions.slice(0, 4).map((assumption, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <span className="text-blue-500">•</span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Fallback Plan */}
      {explanation.fallback && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            Backup Plan
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {explanation.fallback}
          </p>
        </div>
      )}
    </div>
  );
}
