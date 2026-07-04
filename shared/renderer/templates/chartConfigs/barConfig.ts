import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function barConfig(data: ChartData, palette: ChartPalette, base: object) {
  const { labels = [], values = [] } = data;
  return {
    type: "bar" as const,
    data: { labels, datasets: [{
      data: values,
      backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
      borderRadius: 6,
      borderSkipped: false,
      borderColor: "transparent",
      borderWidth: 0,
    }] },
    options: { ...base, indexAxis: "y" as const,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 17 } } },
        x: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
      } },
  };
}

export function columnConfig(data: ChartData, palette: ChartPalette, base: object) {
  const { labels = [], values = [] } = data;
  return {
    type: "bar" as const,
    data: { labels, datasets: [{
      data: values,
      backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
      borderRadius: 8,
      borderSkipped: false,
      borderColor: "transparent",
      borderWidth: 0,
    }] },
    options: { ...base, indexAxis: "x" as const,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 15 } } },
        y: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
      } },
  };
}
