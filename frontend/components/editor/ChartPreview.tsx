"use client";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler,
);

// Palette matching our Jinja2 templates
const COLORS = ["#7C6EFA", "#2DD4BF", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#10B981", "#F97316"];

const BASE_OPTS = {
  animation: false as const,   // must be false — prevents mid-frame screenshots
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { ticks: { color: "#aaa" }, grid: { color: "#333" } }, y: { ticks: { color: "#aaa" }, grid: { color: "#333" } } },
};

interface ChartPreviewProps {
  chartType: string;
  labels: string[];
  values: number[];
  height?: number;
}

export function ChartPreview({ chartType, labels, values, height = 200 }: ChartPreviewProps) {
  if (!labels.length || !values.length) return null;

  const bg = labels.map((_, i) => COLORS[i % COLORS.length]);
  const dataset = { data: values, backgroundColor: bg, borderColor: bg, borderWidth: 1, fill: false };

  const style = { height: `${height}px`, width: "100%" };

  if (chartType === "donut") {
    return (
      <div style={style}>
        <Doughnut
          data={{ labels, datasets: [{ data: values, backgroundColor: bg, borderColor: bg, borderWidth: 1 }] }}
          options={{ ...BASE_OPTS, scales: undefined as any, cutoutPercentage: 58 } as any}
        />
      </div>
    );
  }
  if (chartType === "line") {
    return (
      <div style={style}>
        <Line data={{ labels, datasets: [{ ...dataset, tension: 0.4 }] }} options={BASE_OPTS} />
      </div>
    );
  }
  if (chartType === "radar") {
    return (
      <div style={style}>
        <Radar
          data={{ labels, datasets: [{ ...dataset, borderColor: COLORS[0], backgroundColor: `${COLORS[0]}33` }] }}
          options={{ ...BASE_OPTS, scales: { r: { ticks: { color: "#aaa" }, grid: { color: "#333" }, pointLabels: { color: "#ccc" } } } }}
        />
      </div>
    );
  }
  // bar, column, funnel → Bar (horizontal for column)
  const isHorizontal = chartType === "bar";
  return (
    <div style={style}>
      <Bar
        data={{ labels, datasets: [dataset] }}
        options={{
          ...BASE_OPTS,
          indexAxis: isHorizontal ? ("y" as const) : ("x" as const),
        }}
      />
    </div>
  );
}
