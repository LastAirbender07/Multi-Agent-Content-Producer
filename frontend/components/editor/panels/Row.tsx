"use client";
// Shared helper component for labelled property rows in RightPanel
export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-[10px] text-zinc-500">{label}</p>}
      {children}
    </div>
  );
}
