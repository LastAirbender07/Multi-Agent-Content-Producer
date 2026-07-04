import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function scatterConfig(data: ChartData, palette: ChartPalette, base: object, xScale: object, yScale: object) {
  const { points = [] } = data;
  return {
    type: "scatter",
    data: { datasets: [{ data: points as { x: number; y: number }[],
      backgroundColor: palette.COLORS[0], pointRadius: 8 }] },
    options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } },
  };
}

export function bubbleConfig(data: ChartData, palette: ChartPalette, base: object, xScale: object, yScale: object) {
  const { points = [] } = data;
  return {
    type: "bubble",
    data: { datasets: [{ data: points as { x: number; y: number; r: number }[],
      backgroundColor: palette.COLORS.map((c: string) => `${c}99`) }] },
    options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } },
  };
}
