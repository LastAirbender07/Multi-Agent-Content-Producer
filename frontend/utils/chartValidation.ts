import type { ChartType, ChartData } from "@/types/chart";

export function getChartWarnings(type: ChartType, data: ChartData): string[] {
  const w: string[] = [];
  const vals = data.values ?? [];

  if (type === "donut" && vals.length > 0) {
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum < 80 || sum > 120) {
      w.push(`Values sum to ${Math.round(sum)} — donut charts should sum to ~100%`);
    }
  }

  if (type === "funnel" && vals.length > 1) {
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) {
        w.push(`Step ${i + 1} (${vals[i]}) > step ${i} (${vals[i - 1]}) — funnel values should decrease`);
        break;
      }
    }
  }

  const long = (data.labels ?? []).filter(l => String(l).length > 22);
  if (long.length > 0) {
    w.push(`${long.length} label${long.length > 1 ? "s" : ""} exceed 22 chars and will be truncated`);
  }

  return w;
}
