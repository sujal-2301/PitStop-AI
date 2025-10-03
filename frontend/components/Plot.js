// frontend/components/Plot.js
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin
);

const PALETTE = [
  "rgb(37,99,235)", // blue
  "rgb(16,185,129)", // green
  "rgb(249,115,22)", // orange
  "rgb(147,51,234)", // purple
  "rgb(220,38,38)", // red
];

export default function Plot({ simResult }) {
  const baseLap = simResult.base_lap || 0;
  const cands = simResult.candidates || [];
  if (!cands.length) return null;

  // x-axis labels from the longest series
  const maxLen = Math.max(...cands.map((c) => (c.p50_by_lap || []).length));
  const labels = Array.from({ length: maxLen }, (_, i) => baseLap + i);

  const datasets = [];
  const annotations = {};

  cands.forEach((cand, idx) => {
    const color = PALETTE[idx % PALETTE.length];
    const label = `P50 • Lap ${cand.candidate?.pit_lap} • ${String(
      cand.candidate?.compound || ""
    ).toUpperCase()}`;

    // P50 line for this candidate
    datasets.push({
      label,
      data: cand.p50_by_lap || [],
      borderColor: color,
      backgroundColor: color,
      tension: 0.25,
      pointRadius: 0,
      fill: false,
    });

    // Optional: uncertainty band for the first candidate only
    if (idx === 0 && cand.p10_by_lap && cand.p90_by_lap) {
      datasets.push({
        label: "P10",
        data: cand.p10_by_lap,
        borderColor: color,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false,
      });
      datasets.push({
        label: "P90",
        data: cand.p90_by_lap,
        borderColor: color,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: "-1",
        backgroundColor: "rgba(0,0,0,0.05)",
      });
    }

    // Vertical pit marker
    const pitIdx = cand.pit_index ?? null;
    if (pitIdx !== null && pitIdx >= 0 && pitIdx < labels.length) {
      annotations[`pit-${idx}`] = {
        type: "line",
        xMin: labels[pitIdx],
        xMax: labels[pitIdx],
        borderColor: color,
        borderWidth: 2,
        borderDash: [2, 4],
        label: {
          display: true,
          content: `Pit ${labels[pitIdx]}`,
          position: "start",
          backgroundColor: "rgba(255,255,255,0.8)",
          color: "#111827",
          padding: 4,
        },
      };
    }
  });

  // Add zero reference line
  annotations.zeroLine = {
    type: "line",
    yMin: 0,
    yMax: 0,
    borderColor: "#9CA3AF",
    borderWidth: 1,
    borderDash: [4, 4],
    label: {
      display: true,
      content: "Zero gap",
      position: "end",
      backgroundColor: "rgba(255,255,255,0.8)",
      color: "#6B7280",
      font: { size: 10 },
    },
  };

  // Add SC window shading if present
  const scWindow = simResult.sc_window;
  if (scWindow && scWindow.start_lap && scWindow.end_lap) {
    annotations.scShading = {
      type: "box",
      xMin: scWindow.start_lap,
      xMax: scWindow.end_lap,
      backgroundColor: "rgba(255, 215, 0, 0.12)",
      borderColor: "rgba(255, 215, 0, 0.4)",
      borderWidth: 1,
      label: {
        display: true,
        content: "Safety Car",
        position: "start",
        color: "#92400E",
        font: { size: 11, weight: "bold" },
      },
    };
  }

  const data = { labels, datasets };
  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "top" }, annotation: { annotations } },
    scales: {
      y: { title: { display: true, text: "Gap (s) — positive = you ahead" } },
      x: { title: { display: true, text: "Lap number" } },
    },
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Projected Gap vs Laps</h3>
      <Line data={data} options={options} />
    </div>
  );
}
