import type { ChartData, ScatterPoint, BubblePoint } from "@/types/chart";

/**
 * Parse CSV text into a ChartData object.
 *
 * Formats detected:
 *   x,y              → scatter   (first col is numeric)
 *   x,y,r            → bubble    (first col is numeric)
 *   Label,Value      → single series
 *   Label,S1,S2,...  → multi-series (stacked/comparison/radar)
 */
export function parseChartCsv(csv: string): Partial<ChartData> {
  if (!csv.trim()) return {};

  const rows = csv.trim().split("\n").map(l =>
    l.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
  );
  if (rows.length < 2) return {};

  const [header, ...data] = rows;
  if (!header.length || !data.length) return {};

  // Detect scatter/bubble: first column is numeric
  const firstDataCell = data[0]?.[0] ?? "";
  const firstIsNumeric = !isNaN(Number(firstDataCell)) && firstDataCell !== "";

  if (firstIsNumeric && header.length === 2) {
    return {
      labels: [], values: [],
      points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]) } as ScatterPoint)),
    };
  }
  if (firstIsNumeric && header.length === 3) {
    return {
      labels: [], values: [],
      points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]), r: Number(r[2]) } as BubblePoint)),
    };
  }

  // Single series
  if (header.length === 2) {
    return {
      labels: data.map(r => r[0]),
      values: data.map(r => Number(r[1]) || 0),
    };
  }

  // Multi-series (Label, S1, S2, ...)
  return {
    labels: data.map(r => r[0]),
    values: data.map(r => Number(r[1]) || 0),
    series: header.slice(1).map((name, si) => ({
      label: name,
      values: data.map(r => Number(r[si + 1]) || 0),
    })),
  };
}
