// ALL chart types — used by AI-generated pipeline AND user-created charts
export type ChartType =
  // Tier 1: AI-generated (already in Jinja2/Playwright pipeline)
  | "bar" | "column" | "line" | "donut" | "radar" | "funnel"
  // Tier 2: User-created via Chart.js
  | "area" | "stacked-bar" | "stacked-column" | "comparison" | "scatter" | "bubble"
  // Tier 3: User-created as Fabric Groups (no Chart.js needed)
  | "progress" | "number-stat";

export interface ChartSeries  { label: string; values: number[]; color?: string; }
export interface ScatterPoint { x: number; y: number; label?: string; }
export interface BubblePoint  { x: number; y: number; r: number;  label?: string; }

export interface ChartData {
  // Single-series (bar, column, line, area, donut, funnel)
  labels:  string[];
  values:  number[];
  // Multi-series (stacked-bar, stacked-column, comparison, radar)
  series?: ChartSeries[];
  // Scatter / Bubble
  points?: ScatterPoint[] | BubblePoint[];
  // number-stat
  statValue?:   string;   // "₹1.1 Lakh Cr"
  statLabel?:   string;   // "EdTech market size"
  statContext?: string;   // "Source: KPMG 2024"
  // progress
  progressItems?: Array<{ label: string; value: number; max?: number }>;
  // Styling overrides
  colors?:     string[];  // per-bar/series color overrides
  showLegend?: boolean;
  showGrid?:   boolean;
  unit?:       string;    // "%" | "$" | "K" — appended to axis labels
  title?:      string;    // optional chart title above the chart
}

// Stored on every Fabric chart object's .data property for re-editing
export interface ChartObjectData {
  role:      "chart";
  chartType: ChartType;
  chartData: ChartData;
  theme:     "aurora" | "lumina";
  width:     number;
  height:    number;
}
