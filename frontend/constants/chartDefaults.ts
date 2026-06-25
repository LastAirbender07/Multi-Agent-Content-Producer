import type { ChartType, ChartData } from "@/types/chart";

export const MULTI_SERIES_TYPES: ChartType[] = ["stacked-bar", "stacked-column", "comparison", "radar"];
export const NO_PREVIEW_TYPES: ChartType[] = ["funnel", "progress", "number-stat"];

export const DEFAULT_DATA: Record<ChartType, ChartData> = {
  "bar":            { labels: ["Option A","Option B","Option C","Option D"], values: [120,200,150,80] },
  "column":         { labels: ["Q1","Q2","Q3","Q4"], values: [120,200,150,180] },
  "line":           { labels: ["Jan","Feb","Mar","Apr","May"], values: [40,80,60,100,90] },
  "area":           { labels: ["Jan","Feb","Mar","Apr","May"], values: [40,80,60,100,90] },
  "donut":          { labels: ["A","B","C","D"], values: [35,25,25,15] },
  "radar":          { labels: ["Speed","Power","Range","Economy","Safety"], values: [80,60,70,90,75],
                      series: [{ label: "Product A", values: [80,60,70,90,75] }, { label: "Product B", values: [60,80,50,70,85] }] },
  "funnel":         { labels: ["Awareness","Interest","Consideration","Intent","Purchase"], values: [1000,750,500,300,150] },
  "stacked-bar":    { labels: ["Q1","Q2","Q3"], values: [120,200,150],
                      series: [{ label: "Revenue", values: [120,200,150] }, { label: "Cost", values: [80,120,90] }] },
  "stacked-column": { labels: ["Q1","Q2","Q3"], values: [120,200,150],
                      series: [{ label: "Revenue", values: [120,200,150] }, { label: "Cost", values: [80,120,90] }] },
  "comparison":     { labels: ["Feature 1","Feature 2","Feature 3"], values: [80,60,90],
                      series: [{ label: "Ours", values: [80,60,90] }, { label: "Competitor", values: [60,80,70] }] },
  "scatter":        { labels: [], values: [], points: [{x:10,y:20},{x:25,y:40},{x:35,y:30},{x:50,y:60},{x:65,y:45}] },
  "bubble":         { labels: [], values: [], points: [{x:10,y:20,r:8},{x:25,y:40,r:15},{x:50,y:30,r:10}] },
  "progress":       { labels: [], values: [], progressItems: [{ label: "Goal 1", value: 75 }, { label: "Goal 2", value: 45 }, { label: "Goal 3", value: 90 }] },
  "number-stat":    { labels: [], values: [], statValue: "42%", statLabel: "Conversion Rate", statContext: "Q4 2025" },
};
