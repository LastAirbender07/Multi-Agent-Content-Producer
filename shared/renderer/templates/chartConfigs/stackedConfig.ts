import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function stackedBarConfig(data: ChartData, palette: ChartPalette, base: object, yScale: object) {
  const { labels = [], series = [] } = data;
  const ds = series.map((s, i) => ({ label: s.label, data: s.values,
    backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s",
    borderColor: "transparent", borderWidth: 0 }));
  return {
    type: "bar",
    data: { labels, datasets: ds },
    options: { ...base, indexAxis: "y",
      plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
      scales: { y: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } },
        x: { stacked: true, ...yScale } } },
  };
}

export function stackedColumnConfig(data: ChartData, palette: ChartPalette, base: object, yScale: object) {
  const { labels = [], series = [] } = data;
  const ds = series.map((s, i) => ({ label: s.label, data: s.values,
    backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s",
    borderColor: "transparent", borderWidth: 0 }));
  return {
    type: "bar",
    data: { labels, datasets: ds },
    options: { ...base, indexAxis: "x",
      plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } },
        y: { stacked: true, ...yScale } } },
  };
}

export function comparisonConfig(data: ChartData, palette: ChartPalette, base: object, xScale: object, yScale: object) {
  const { labels = [], series = [] } = data;
  const ds = series.map((s, i) => ({ label: s.label, data: s.values,
    backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 6,
    borderSkipped: false, borderColor: "transparent", borderWidth: 0 }));
  return {
    type: "bar",
    data: { labels, datasets: ds },
    options: { ...base,
      plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
      scales: { x: { ...xScale, grid: { display: false } }, y: yScale } },
  };
}
