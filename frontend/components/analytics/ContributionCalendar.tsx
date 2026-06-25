"use client";
import { useRef } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL = 12;
const GAP  = 3;
const STEP = CELL + GAP;
const DOW_LABEL_W  = 30;
const MONTH_LABEL_H = 20;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Cell colour ───────────────────────────────────────────────────────────────

type CellState = "past-empty" | "past-data" | "today" | "future" | "padding";

function cellColor(state: CellState, count: number): string {
  if (state === "padding")    return "transparent";
  if (state === "future")     return "#27272a";
  if (state === "today")      return count > 0 ? "#7c3aed" : "#52525b";
  if (state === "past-empty") return "#3f3f46";
  if (count === 1)  return "#4c1d95";
  if (count <= 3)   return "#6d28d9";
  if (count <= 6)   return "#7c3aed";
  if (count <= 10)  return "#8b5cf6";
  return "#a78bfa";
}

// ── Grid builder ──────────────────────────────────────────────────────────────

type Cell = { ds: string; state: CellState; count: number };

function buildGrid(selectedYear: number, activityMap: Record<string, number>, todayStr: string) {
  const jan1 = new Date(selectedYear, 0, 1);
  const startSun = new Date(jan1);
  startSun.setDate(jan1.getDate() - jan1.getDay());

  const weeks: Cell[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  let prevMonth = -1;

  for (let w = 0; w < 53; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(startSun);
      cur.setDate(startSun.getDate() + w * 7 + d);
      const ds = cur.toISOString().split("T")[0];
      const inYear = cur.getFullYear() === selectedYear;
      const m = cur.getMonth();

      if (d === 0 && inYear && m !== prevMonth) {
        monthLabels.push({ col: w, label: MONTH_NAMES[m] });
        prevMonth = m;
      }

      let state: CellState = "padding";
      if (inYear) {
        if (ds > todayStr)        state = "future";
        else if (ds === todayStr) state = "today";
        else                      state = "past-empty";
        if (state === "past-empty" && (activityMap[ds] ?? 0) > 0) state = "past-data";
      }
      week.push({ ds, state, count: activityMap[ds] ?? 0 });
    }
    weeks.push(week);
  }

  return { weeks, monthLabels };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ContributionCalendarProps {
  activityMap: Record<string, number>;
  allYears: number[];
  selectedYear: number;
  onYearChange: (y: number) => void;
  todayStr: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ContributionCalendar({
  activityMap, allYears, selectedYear, onYearChange, todayStr,
}: ContributionCalendarProps) {
  // Tooltip is driven by direct DOM mutation — no state, no re-renders on hover
  const tipRef = useRef<HTMLDivElement>(null);

  // Year stats
  const yearPrefix = `${selectedYear}-`;
  const yearRuns = Object.entries(activityMap)
    .filter(([d]) => d.startsWith(yearPrefix))
    .reduce((s, [, v]) => s + v, 0);
  const yearDays = Object.entries(activityMap)
    .filter(([d, v]) => d.startsWith(yearPrefix) && v > 0).length;

  // Streak (consecutive days back from today)
  let streak = 0;
  const todayDate = new Date(todayStr + "T00:00:00");
  for (let i = 0; ; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    if ((activityMap[ds] ?? 0) > 0) streak++;
    else break;
  }

  const { weeks, monthLabels } = buildGrid(selectedYear, activityMap, todayStr);

  const svgW = DOW_LABEL_W + 53 * STEP - GAP;
  const svgH = MONTH_LABEL_H + 7 * STEP - GAP;

  const showTip = (e: React.MouseEvent, ds: string, state: CellState, count: number) => {
    const el = tipRef.current;
    if (!el || state === "padding") return;
    const d = new Date(ds + "T00:00:00");
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const text = state === "future" ? label
      : count === 0 ? `${label}  ·  no runs`
      : `${label}  ·  ${count} run${count !== 1 ? "s" : ""}`;
    el.textContent = text;
    el.style.left    = `${e.clientX + 14}px`;
    el.style.top     = `${e.clientY - 40}px`;
    el.style.opacity = "1";
  };
  const hideTip = () => {
    if (tipRef.current) tipRef.current.style.opacity = "0";
  };

  return (
    <div className="space-y-5">
      {/* Stats row + year picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Runs in {selectedYear}</p>
            <p className="text-2xl font-black text-white leading-tight tabular-nums">{yearRuns}</p>
          </div>
          <div className="w-px h-6 bg-zinc-800" />
          <div>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Active days</p>
            <p className="text-2xl font-black text-white leading-tight tabular-nums">{yearDays}</p>
          </div>
          {streak > 0 && <>
            <div className="w-px h-6 bg-zinc-800" />
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Streak</p>
              <p className="text-2xl font-black text-white leading-tight">{streak}d 🔥</p>
            </div>
          </>}
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-xl border border-zinc-700/40">
          {allYears.map(y => (
            <button key={y} onClick={() => onYearChange(y)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                y === selectedYear
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >{y}</button>
          ))}
        </div>
      </div>

      {/* SVG grid */}
      <div className="w-full overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ display: "block" }} onMouseLeave={hideTip}>
          {/* Month labels — x aligned to exact week column */}
          {monthLabels.map(({ col, label }) => (
            <text key={label}
              x={DOW_LABEL_W + col * STEP} y={MONTH_LABEL_H - 5}
              fontSize={9} fontWeight={700} fill="#71717a"
              fontFamily="ui-sans-serif, system-ui, sans-serif" letterSpacing={0.8}
            >{label}</text>
          ))}
          {/* DOW labels */}
          {["", "Mon", "", "Wed", "", "Fri", ""].map((lbl, row) => lbl && (
            <text key={row}
              x={DOW_LABEL_W - 4} y={MONTH_LABEL_H + row * STEP + CELL - 1}
              fontSize={8} fill="#52525b" textAnchor="end"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >{lbl}</text>
          ))}
          {/* Cells */}
          {weeks.map((week, wi) => week.map(({ ds, state, count }, di) => {
            if (state === "padding") return null;
            const x = DOW_LABEL_W + wi * STEP;
            const y = MONTH_LABEL_H + di * STEP;
            return (
              <rect key={`${wi}-${di}`}
                x={x} y={y} width={CELL} height={CELL} rx={2} ry={2}
                fill={cellColor(state, count)}
                stroke={state === "today" ? "#c4b5fd" : "none"}
                strokeWidth={state === "today" ? 1.5 : 0}
                style={{ cursor: "default" }}
                onMouseEnter={e => showTip(e, ds, state, count)}
                onMouseLeave={hideTip}
              />
            );
          }))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-zinc-700 font-medium">Less</span>
        {["#3f3f46","#4c1d95","#6d28d9","#7c3aed","#a78bfa"].map((c, i) => (
          <svg key={i} width={11} height={11}><rect width={11} height={11} rx={2} fill={c} /></svg>
        ))}
        <span className="text-[9px] text-zinc-700 font-medium">More</span>
        <div className="ml-4 flex items-center gap-1.5">
          <svg width={11} height={11}><rect width={11} height={11} rx={2} fill="#27272a" /></svg>
          <span className="text-[9px] text-zinc-700 font-medium">Future</span>
        </div>
      </div>

      {/* Tooltip — always mounted, shown/hidden via direct DOM opacity (no re-renders) */}
      <div
        ref={tipRef}
        className="fixed z-[9999] pointer-events-none
          px-2.5 py-1.5 rounded-xl whitespace-nowrap
          bg-zinc-900/95 border border-zinc-700/50 backdrop-blur-md
          text-[11px] font-semibold text-zinc-200 shadow-2xl shadow-black/80
          transition-opacity duration-100"
        style={{ opacity: 0, top: 0, left: 0 }}
      >
        <div className="absolute top-full left-4
          border-l-[5px] border-r-[5px] border-t-[6px]
          border-l-transparent border-r-transparent border-t-zinc-700/50" />
      </div>
    </div>
  );
}
