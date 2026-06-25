import type { ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";

export function radarConfig(data: ChartData, palette: ChartPalette, base: object) {
  const { labels = [], values = [], series, showLegend } = data;
  const rds = series?.length
    ? series.map((s, i) => ({ label: s.label, data: s.values,
        backgroundColor: `${palette.COLORS[i]}30`, borderColor: palette.COLORS[i], borderWidth: 2.5 }))
    : [{ data: values, backgroundColor: `${palette.COLORS[0]}30`,
        borderColor: palette.COLORS[0], borderWidth: 2.5, label: "" }];
  return {
    type: "radar",
    data: { labels, datasets: rds },
    options: { ...base,
      plugins: { legend: { display: showLegend ?? (series?.length ?? 0) > 1,
        labels: { color: palette.LABEL } } },
      scales: { r: { grid: { color: palette.GRID }, angleLines: { color: palette.GRID },
        pointLabels: { color: palette.LABEL, font: { size: 15 } }, ticks: { display: false } } } },
  };
}
