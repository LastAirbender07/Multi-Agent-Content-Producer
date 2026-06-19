"use client";
import { CHART_COLORS } from "@/utils/canvasTokens";
import type { ChartType } from "@/types/chart";

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

// Inline SVG icons for each chart type (48×32)
const BAR_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="2"  y="8"  width="10" height="22" rx="2" fill="currentColor" opacity="0.9"/>
    <rect x="14" y="4"  width="10" height="26" rx="2" fill="currentColor"/>
    <rect x="26" y="12" width="10" height="18" rx="2" fill="currentColor" opacity="0.8"/>
    <rect x="38" y="2"  width="10" height="28" rx="2" fill="currentColor" opacity="0.7"/>
  </svg>
);
const COL_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="2"  y="20" width="8"  height="12" rx="2" fill="currentColor" opacity="0.7"/>
    <rect x="13" y="12" width="8"  height="20" rx="2" fill="currentColor"/>
    <rect x="24" y="16" width="8"  height="16" rx="2" fill="currentColor" opacity="0.8"/>
    <rect x="35" y="6"  width="8"  height="26" rx="2" fill="currentColor" opacity="0.9"/>
  </svg>
);
const LINE_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <polyline points="2,26 12,16 22,20 32,8 46,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {[2,12,22,32,46].map((x,i)=><circle key={i} cx={x} cy={[26,16,20,8,12][i]} r="3" fill="currentColor"/>)}
  </svg>
);
const AREA_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <path d="M2,26 L12,16 L22,20 L32,8 L46,12 L46,30 L2,30 Z" fill="currentColor" opacity="0.3"/>
    <polyline points="2,26 12,16 22,20 32,8 46,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);
const DONUT_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="6" strokeDasharray="32 50" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="6" strokeDasharray="18 64" strokeDashoffset="-32" opacity="0.6" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="7" fill="#090909"/>
    <text x="34" y="12" fontSize="8" fill="currentColor" opacity="0.8">■ A</text>
    <text x="34" y="22" fontSize="8" fill="currentColor" opacity="0.5">■ B</text>
  </svg>
);
const RADAR_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <polygon points="24,2 44,14 38,30 10,30 4,14" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3"/>
    <polygon points="24,8 36,16 32,26 16,26 12,16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
  </svg>
);
const FUNNEL_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="4"  y="4"  width="40" height="7" rx="2" fill="currentColor"/>
    <rect x="8"  y="13" width="32" height="7" rx="2" fill="currentColor" opacity="0.8"/>
    <rect x="14" y="22" width="20" height="7" rx="2" fill="currentColor" opacity="0.6"/>
  </svg>
);
const STACKED_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="4"  y="18" width="16" height="12" rx="2" fill="currentColor"/>
    <rect x="4"  y="8"  width="16" height="10" rx="2" fill="currentColor" opacity="0.6"/>
    <rect x="28" y="14" width="16" height="16" rx="2" fill="currentColor"/>
    <rect x="28" y="6"  width="16" height="8"  rx="2" fill="currentColor" opacity="0.6"/>
  </svg>
);
const COMPARE_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="4"  y="12" width="8" height="18" rx="2" fill="currentColor"/>
    <rect x="14" y="8"  width="8" height="22" rx="2" fill="currentColor" opacity="0.6"/>
    <rect x="28" y="6"  width="8" height="24" rx="2" fill="currentColor"/>
    <rect x="38" y="14" width="8" height="16" rx="2" fill="currentColor" opacity="0.6"/>
  </svg>
);
const SCATTER_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    {[[8,24],[16,12],[22,20],[30,6],[38,16],[42,22]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r="3" fill="currentColor" opacity={0.6+i*0.08}/>
    ))}
  </svg>
);
const BUBBLE_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <circle cx="12" cy="22" r="8"  fill="currentColor" opacity="0.5"/>
    <circle cx="28" cy="14" r="6"  fill="currentColor" opacity="0.7"/>
    <circle cx="40" cy="20" r="4"  fill="currentColor" opacity="0.9"/>
    <circle cx="20" cy="8"  r="3"  fill="currentColor"/>
  </svg>
);
const PROGRESS_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <rect x="4" y="4"  width="44" height="7" rx="3" fill="currentColor" opacity="0.15"/>
    <rect x="4" y="4"  width="32" height="7" rx="3" fill="currentColor"/>
    <rect x="4" y="14" width="44" height="7" rx="3" fill="currentColor" opacity="0.15"/>
    <rect x="4" y="14" width="20" height="7" rx="3" fill="currentColor" opacity="0.7"/>
    <rect x="4" y="24" width="44" height="7" rx="3" fill="currentColor" opacity="0.15"/>
    <rect x="4" y="24" width="38" height="7" rx="3" fill="currentColor" opacity="0.9"/>
  </svg>
);
const BIGNUM_ICON = (
  <svg viewBox="0 0 48 32" fill="none" className="w-12 h-8">
    <text x="3" y="26" fontSize="26" fontWeight="bold" fill="currentColor">42</text>
    <text x="36" y="28" fontSize="8" fill="currentColor" opacity="0.6">%</text>
  </svg>
);

const TILES: ChartTile[] = [
  { type: "bar",           label: "Bar",          description: "Horizontal bars",     icon: BAR_ICON,      category: "basic" },
  { type: "column",        label: "Column",       description: "Vertical bars",        icon: COL_ICON,      category: "basic" },
  { type: "line",          label: "Line",         description: "Trend over time",      icon: LINE_ICON,     category: "basic" },
  { type: "area",          label: "Area",         description: "Filled trend",         icon: AREA_ICON,     category: "basic" },
  { type: "donut",         label: "Donut",        description: "Part of whole",         icon: DONUT_ICON,    category: "basic" },
  { type: "stacked-bar",   label: "Stacked",      description: "Stacked categories",   icon: STACKED_ICON,  category: "comparative" },
  { type: "stacked-column",label: "Stacked Col",  description: "Stacked vertical",     icon: STACKED_ICON,  category: "comparative" },
  { type: "comparison",    label: "Compare",      description: "Side by side",         icon: COMPARE_ICON,  category: "comparative" },
  { type: "radar",         label: "Radar",        description: "Multi-dimensional",    icon: RADAR_ICON,    category: "comparative" },
  { type: "funnel",        label: "Funnel",       description: "Conversion flow",      icon: FUNNEL_ICON,   category: "special" },
  { type: "scatter",       label: "Scatter",      description: "Correlation plot",     icon: SCATTER_ICON,  category: "special" },
  { type: "bubble",        label: "Bubble",       description: "3-variable data",      icon: BUBBLE_ICON,   category: "special" },
  { type: "progress",      label: "Progress",     description: "Goal completion",      icon: PROGRESS_ICON, category: "data" },
  { type: "number-stat",   label: "Big Number",   description: "Single KPI",           icon: BIGNUM_ICON,   category: "data" },
];

const CATEGORY_LABELS = {
  basic: "Common",
  comparative: "Comparative",
  special: "Advanced",
  data: "Data Display",
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
