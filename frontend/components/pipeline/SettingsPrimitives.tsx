"use client";

// ─── Stepper — +/- number control ────────────────────────────────────────────

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export function Stepper({ value, min = 1, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center text-sm font-bold transition-all"
      >
        −
      </button>
      <span className="w-7 text-center text-xs font-semibold text-zinc-100 tabular-nums">{value}</span>
      <button
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center text-sm font-bold transition-all"
      >
        +
      </button>
    </div>
  );
}

// ─── SettingRow — label + hint + right-aligned control ────────────────────────

interface SettingRowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, hint, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        {hint && <p className="text-[10px] text-zinc-600 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── ToggleRow — SettingRow + toggle switch ────────────────────────────────────

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <SettingRow label={label} hint={hint}>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          checked ? "bg-violet-600" : "bg-zinc-700"
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`} />
      </button>
    </SettingRow>
  );
}

// ─── SectionHead — uppercase section label ────────────────────────────────────

export function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600 pt-3 pb-1 first:pt-0">
      {children}
    </p>
  );
}
