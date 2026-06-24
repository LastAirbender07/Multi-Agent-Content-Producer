"use client";
import { Row } from "./Row";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface Props {
  obj: AnyObj;
  canvas: AnyObj;
  onChanged: () => void;
}

export function TextPropertyPanel({ obj, canvas, onChanged }: Props) {
  function mutate(updates: Record<string, unknown>) {
    if (!obj || !canvas) return;
    obj.set(updates);
    canvas.renderAll();
    onChanged();
  }

  return (
    <div className="p-3 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Text</p>

      <Row label="Font family">
        <select value={(obj.fontFamily ?? "Plus Jakarta Sans").split(",")[0].trim()}
          onChange={e => mutate({ fontFamily: e.target.value })}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50">
          <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
          <option value="Syne">Syne</option>
          <option value="Georgia">Georgia</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
        </select>
      </Row>

      <Row label="Font size">
        <div className="flex items-center gap-1.5">
          <input type="number" min={6} max={300} step={1} value={obj.fontSize ?? 16}
            onChange={e => mutate({ fontSize: Number(e.target.value) })}
            className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50" />
          <div className="flex flex-wrap gap-0.5">
            {[16, 24, 32, 48, 64].map(sz => (
              <button key={sz} onClick={() => mutate({ fontSize: sz })}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${obj.fontSize === sz ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                {sz}
              </button>
            ))}
          </div>
        </div>
      </Row>

      <Row label="Weight">
        <div className="flex gap-1">
          {(["normal", "bold"] as const).map(w => (
            <button key={w} onClick={() => mutate({ fontWeight: w })}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${obj.fontWeight === w ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
              {w}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Style">
        <div className="flex gap-1">
          {(["normal", "italic"] as const).map(s => (
            <button key={s} onClick={() => mutate({ fontStyle: s })}
              className={`flex-1 py-1 rounded-lg text-xs capitalize transition-all ${obj.fontStyle === s ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Color">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-700">
            <div className="absolute inset-0" style={{ background: obj.fill ?? "#ffffff" }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={obj.fill ?? "#ffffff"}
              onChange={e => mutate({ fill: e.target.value })} />
          </div>
          <input type="text" value={obj.fill ?? "#ffffff"}
            onChange={e => mutate({ fill: e.target.value })}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50" />
        </div>
      </Row>

      <Row label={`Line height (${(obj.lineHeight ?? 1.2).toFixed(1)})`}>
        <input type="range" min={0.8} max={3} step={0.1} value={obj.lineHeight ?? 1.2}
          onChange={e => mutate({ lineHeight: Number(e.target.value) })}
          className="w-full accent-violet-500" />
      </Row>

      <Row label={`Letter spacing (${obj.charSpacing ?? 0})`}>
        <input type="range" min={-100} max={800} step={10} value={obj.charSpacing ?? 0}
          onChange={e => mutate({ charSpacing: Number(e.target.value) })}
          className="w-full accent-violet-500" />
      </Row>

      <Row label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map(a => (
            <button key={a} onClick={() => mutate({ textAlign: a })}
              className={`flex-1 py-1 rounded-lg text-xs capitalize transition-all ${obj.textAlign === a ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
              {a[0].toUpperCase()}
            </button>
          ))}
        </div>
      </Row>

      <Row label={`Opacity (${Math.round((obj.opacity ?? 1) * 100)}%)`}>
        <input type="range" min={0} max={100} step={1} value={Math.round((obj.opacity ?? 1) * 100)}
          onChange={e => mutate({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-violet-500" />
      </Row>
    </div>
  );
}
