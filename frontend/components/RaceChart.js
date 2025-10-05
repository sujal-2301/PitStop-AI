// frontend/components/RaceChart.js
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
  { border: "rgb(59, 130, 246)", bg: "rgba(59, 130, 246, 0.15)", name: "Blue" },
  {
    border: "rgb(16, 185, 129)",
    bg: "rgba(16, 185, 129, 0.15)",
    name: "Green",
  },
  {
    border: "rgb(249, 115, 22)",
    bg: "rgba(249, 115, 22, 0.15)",
    name: "Orange",
  },
];

export default function RaceChart({ simResult, selectedIndex }) {
  const baseLap = simResult.base_lap || 0;
  const cands = simResult.candidates || [];
  if (!cands.length) return null;

  const maxLen = Math.max(...cands.map((c) => (c.p50_by_lap || []).length));
  const labels = Array.from({ length: maxLen }, (_, i) => baseLap + i);

  const datasets = [];
  const annotations = {};

  // Reorder so the recommended candidate (selectedIndex) is first, for clarity
  let ordered = [...cands];
  const sel = typeof selectedIndex === "number" ? selectedIndex : 0;
  if (sel >= 0 && sel < ordered.length) {
    const [chosen] = ordered.splice(sel, 1);
    ordered = [chosen, ...ordered];
  }
  const topCands = ordered.slice(0, 3);

  topCands.forEach((cand, idx) => {
    const colorPalette = PALETTE[idx % PALETTE.length];
    const compound = String(cand.candidate?.compound || "").toUpperCase();
    const compoundIcon =
      { SOFT: "🔴", MEDIUM: "🟡", HARD: "⚫" }[compound] || "⚪";
    const pitLap = cand.candidate?.pit_lap;
    const label = `${compoundIcon} Pit Lap ${pitLap} (${compound})${
      idx === 0 ? "  — Recommended" : ""
    }`;

    datasets.push({
      label,
      data: cand.p50_by_lap || [],
      borderColor: colorPalette.border,
      backgroundColor: colorPalette.bg,
      borderWidth: idx === 0 ? 5 : 3,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: colorPalette.border,
      fill: false,
    });

    if (idx === 0) {
      const pitLapNum = Number(cand.candidate?.pit_lap);
      if (!Number.isNaN(pitLapNum)) {
        annotations[`pit-${idx}`] = {
          type: "line",
          xMin: pitLapNum,
          xMax: pitLapNum,
          borderColor: colorPalette.border,
          borderWidth: 2,
          borderDash: [8, 4],
          label: {
            display: true,
            content: `🔧 Pit L${pitLapNum}`,
            position: "start",
            backgroundColor: colorPalette.border,
            color: "#ffffff",
            padding: 8,
            font: { size: 12, weight: "bold" },
          },
        };
      }
    }
  });

  annotations.zeroLine = {
    type: "line",
    yMin: 0,
    yMax: 0,
    borderColor: "#059669",
    borderWidth: 3,
    borderDash: [10, 5],
    label: {
      display: true,
      content: "✦ EVEN ✦",
      position: "end",
      backgroundColor: "#059669",
      color: "#ffffff",
      font: { size: 13, weight: "bold" },
      padding: 8,
    },
  };

  const scWindow = simResult.sc_window;
  if (scWindow && scWindow.start_lap && scWindow.end_lap) {
    annotations.scShading = {
      type: "box",
      xMin: scWindow.start_lap,
      xMax: scWindow.end_lap,
      backgroundColor: "rgba(251, 191, 36, 0.2)",
      borderColor: "rgba(245, 158, 11, 0.6)",
      borderWidth: 2,
      label: {
        display: true,
        content: "🚨 Safety Car",
        position: "start",
        color: "#78350F",
        font: { size: 12, weight: "bold" },
      },
    };
  }

  const data = { labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.2,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        labels: {
          padding: 20,
          font: { size: 14, weight: "700" },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      annotation: { annotations },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        padding: 16,
        titleFont: { size: 15, weight: "bold" },
        bodyFont: { size: 14 },
        displayColors: true,
        callbacks: {
          title: (items) => `📍 Lap ${items[0].label}`,
          label: (item) => {
            const val = item.parsed.y;
            if (val >= 0.5)
              return `${item.dataset.label}: +${val.toFixed(2)}s AHEAD 🟢`;
            if (val >= -0.5)
              return `${item.dataset.label}: ${val.toFixed(2)}s CLOSE 🟡`;
            return `${item.dataset.label}: ${val.toFixed(2)}s BEHIND 🔴`;
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Your Position vs Rival",
          font: { size: 16, weight: "bold" },
          padding: { top: 10, bottom: 10 },
        },
        grid: {
          color: (ctx) =>
            ctx.tick.value === 0
              ? "rgba(5, 150, 105, 0.4)"
              : "rgba(0,0,0,0.08)",
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 3 : 1),
        },
        ticks: {
          callback: (value) =>
            value > 0 ? `+${value}s 🟢` : value < 0 ? `${value}s 🔴` : "EVEN",
          font: { size: 13, weight: "600" },
        },
      },
      x: {
        title: {
          display: true,
          text: "Race Progress (Lap Number)",
          font: { size: 16, weight: "bold" },
          padding: { top: 10, bottom: 10 },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 13, weight: "600" } },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-xl p-6 border-t-4 border-indigo-500 mt-6">
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-l-4 border-indigo-500">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-3">
          <span className="text-3xl">📊</span>
          Race Position Over Time
        </h3>
        <div className="space-y-2 text-base">
          <p className="text-gray-700">
            <strong className="text-indigo-600">📈 Lines going UP</strong> =
            You're getting ahead (good!)
          </p>
          <p className="text-gray-700">
            <strong className="text-red-600">📉 Lines going DOWN</strong> =
            You're falling behind (bad!)
          </p>
          <p className="text-gray-700">
            <strong className="text-green-600">✦ Green dashed line</strong> =
            Even position (zero gap)
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6 rounded-xl shadow-inner">
        <Line data={data} options={options} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <div className="font-bold text-green-900 text-lg">Above the Line</div>
          <div className="text-gray-700 mt-1">You're winning the race!</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300 text-center">
          <div className="text-3xl mb-2">⚡</div>
          <div className="font-bold text-yellow-900 text-lg">On the Line</div>
          <div className="text-gray-700 mt-1">Neck and neck battle!</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <div className="font-bold text-red-900 text-lg">Below the Line</div>
          <div className="text-gray-700 mt-1">Need to catch up!</div>
        </div>
      </div>
    </div>
  );
}
