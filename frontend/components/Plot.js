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
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function Plot({ simResult }) {
  const cand = simResult.candidates[0];
  const p50 = cand.p50_by_lap;
  const p10 = cand.p10_by_lap;
  const p90 = cand.p90_by_lap;
  const labels = p50.map((_, i) => (simResult.base_lap || 0) + i);

  const data = {
    labels,
    datasets: [
      {
        label: "P50 (median)",
        data: p50,
        borderColor: "rgb(37,99,235)",
        fill: false,
      },
      {
        label: "P10",
        data: p10,
        borderColor: "rgb(16,185,129)",
        fill: false,
        borderDash: [5, 5],
      },
      {
        label: "P90",
        data: p90,
        borderColor: "rgb(249,115,22)",
        fill: "-1",
        backgroundColor: "rgba(249,115,22,0.08)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { position: "top" } },
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
