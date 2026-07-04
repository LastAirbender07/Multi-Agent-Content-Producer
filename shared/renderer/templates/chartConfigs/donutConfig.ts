import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function donutConfig(data: ChartData, palette: ChartPalette, base: object) {
  const { labels = [], values = [], showLegend } = data;
  return {
    type: "doughnut",
    data: { labels, datasets: [{ data: values,
      backgroundColor: palette.COLORS.slice(0, values.length),
      borderWidth: 0, hoverOffset: 4 }] },
    options: { ...base, cutout: "58%",
      plugins: { legend: { display: showLegend ?? true, position: "right",
        labels: { color: palette.LABEL, font: { size: 17 }, padding: 20, boxWidth: 18 } } } },
  };
}
