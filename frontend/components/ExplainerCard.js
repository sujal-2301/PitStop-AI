export default function ExplainerCard({ explanation }) {
  if (!explanation)
    return (
      <div className="bg-white p-4 rounded shadow">
        No explanation available.
      </div>
    );

  return (
    <div className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-xl font-semibold">Decision</h2>
      <div className="text-lg">{explanation.decision}</div>

      <h3 className="mt-2 font-medium">Rationale</h3>
      <ul className="list-disc ml-6">
        {explanation.rationale?.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      <h3 className="mt-2 font-medium">Assumptions</h3>
      <ul className="list-disc ml-6">
        {explanation.assumptions?.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>

      <h3 className="mt-2 font-medium">Risks</h3>
      <ul className="list-disc ml-6">
        {explanation.risks?.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>

      <h3 className="mt-2 font-medium">Fallback</h3>
      <div>{explanation.fallback}</div>
    </div>
  );
}
