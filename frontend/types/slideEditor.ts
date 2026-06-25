export type EditorTab = "content" | "style" | "chart" | "image";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

// Snapshot captures all slide state that participates in undo/redo
export interface SlideSnapshot {
  title: string;
  body: string;
  bullets: string[];
  statValue: string;
  statLabel: string;
  chartType: string;
  chartLabels: string[];
  chartValues: number[];
  titleSize: string;
  titleColor: string;
  accentColor: string;
  selectedType: string;
  selectedTheme: string;
}
