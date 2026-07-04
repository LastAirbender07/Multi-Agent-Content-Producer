import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function lineConfig(data: ChartData, palette: ChartPalette, base: object, xScale: object, yScale: object) {
  const { labels = [], values = [] } = data;
  return {
    type: "line",
    data: { labels, datasets: [{ data: values,
      borderColor: palette.COLORS[0],
      backgroundColor: `${palette.COLORS[0]}44`,
      pointBackgroundColor: palette.COLORS[0],
      pointBorderColor: "rgba(0,0,0,0.3)",
      pointRadius: 6, pointBorderWidth: 2,
      tension: 0.4, borderWidth: 3, fill: true }] },
    options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } },
  };
}

export function areaConfig(data: ChartData, palette: ChartPalette, base: object, xScale: object, yScale: object) {
  const { labels = [], values = [] } = data;
  return {
    type: "line",
    data: { labels, datasets: [{ data: values,
      borderColor: palette.COLORS[0],
      backgroundColor: `${palette.COLORS[0]}33`,
      pointRadius: 5, tension: 0.35, borderWidth: 3, fill: true }] },
    options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } },
  };
}
