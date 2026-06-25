"use client";
import { CHART_COLORS } from "@/utils/canvasTokens";
import type { ChartType } from "@/types/chart";
import {
  BAR_ICON, COL_ICON, LINE_ICON, AREA_ICON, DONUT_ICON,
  RADAR_ICON, FUNNEL_ICON, STACKED_ICON, COMPARE_ICON,
  SCATTER_ICON, BUBBLE_ICON, PROGRESS_ICON, BIGNUM_ICON,
} from "./chartTypeIcons";

interface ChartTypePickerProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
}

interface ChartTile {
  type: ChartType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "basic" | "comparative" | "special" | "data";
}

const TILES: ChartTile[] = [
  { type: "bar",            label: "Bar",         description: "Horizontal bars",      icon: BAR_ICON,      category: "basic" },
  { type: "column",         label: "Column",      description: "Vertical bars",         icon: COL_ICON,      category: "basic" },
  { type: "line",           label: "Line",        description: "Trend over time",       icon: LINE_ICON,     category: "basic" },
  { type: "area",           label: "Area",        description: "Filled trend",          icon: AREA_ICON,     category: "basic" },
  { type: "donut",          label: "Donut",       description: "Part of whole",          icon: DONUT_ICON,    category: "basic" },
  { type: "stacked-bar",    label: "Stacked",     description: "Stacked categories",    icon: STACKED_ICON,  category: "comparative" },
  { type: "stacked-column", label: "Stacked Col", description: "Stacked vertical",      icon: STACKED_ICON,  category: "comparative" },
  { type: "comparison",     label: "Compare",     description: "Side by side",          icon: COMPARE_ICON,  category: "comparative" },
  { type: "radar",          label: "Radar",       description: "Multi-dimensional",     icon: RADAR_ICON,    category: "comparative" },
  { type: "funnel",         label: "Funnel",      description: "Conversion flow",       icon: FUNNEL_ICON,   category: "special" },
  { type: "scatter",        label: "Scatter",     description: "Correlation plot",      icon: SCATTER_ICON,  category: "special" },
  { type: "bubble",         label: "Bubble",      description: "3-variable data",       icon: BUBBLE_ICON,   category: "special" },
  { type: "progress",       label: "Progress",    description: "Goal completion",       icon: PROGRESS_ICON, category: "data" },
  { type: "number-stat",    label: "Big Number",  description: "Single KPI",            icon: BIGNUM_ICON,   category: "data" },
];

const CATEGORY_LABELS = {
  basic:       "Common",
  comparative: "Comparative",
  special:     "Advanced",
  data:        "Data Display",
};

export function ChartTypePicker({ value, onChange }: ChartTypePickerProps) {
  const categories = ["basic", "comparative", "special", "data"] as const;
  const color = CHART_COLORS.aurora[0];

  return (
    <div className="space-y-3">
      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-1.5">
            {CATEGORY_LABELS[cat]}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {TILES.filter(t => t.category === cat).map(tile => {
              const active = tile.type === value;
              return (
                <button
                  key={tile.type}
                  onClick={() => onChange(tile.type)}
                  title={tile.description}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    active
                      ? "border-violet-500 bg-violet-600/10 text-violet-300"
                      : "border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800/50"
                  }`}
                  style={{ color: active ? color : undefined }}
                >
                  <div className={active ? "text-violet-400" : "text-zinc-600"}>
                    {tile.icon}
                  </div>
                  <span className="text-[10px] font-semibold leading-none">{tile.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
