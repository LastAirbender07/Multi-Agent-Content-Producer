"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Row } from "./Row";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface Props {
  canvas: AnyObj;
  onChanged: () => void;
}

/**
 * Reads all bullet_item Groups from the canvas, presents them as an editable
 * list, and writes changes back to the Textbox inside each Group.
 *
 * Bullet Group structure (from createBulletItem): [circle (0), num (1), label (2)]
 * label is a fabric.Textbox — we mutate it directly.
 */
export function BulletsPropertyPanel({ canvas, onChanged }: Props) {
  const [bullets, setBullets] = useState<{ text: string; groupObj: AnyObj }[]>([]);

  useEffect(() => {
    if (!canvas) return;
    const groups: { text: string; groupObj: AnyObj }[] = canvas
      .getObjects()
      .filter((o: AnyObj) => o.data?.role === "bullet_item")
      .sort((a: AnyObj, b: AnyObj) => (a.data?.index ?? 0) - (b.data?.index ?? 0))
      .map((g: AnyObj) => {
        const label = g.getObjects?.()?.[2];
        return { text: label?.text ?? "", groupObj: g };
      });
    setBullets(groups);
  }, [canvas]);

  function updateBulletText(idx: number, value: string) {
    if (!canvas) return;
    const { groupObj } = bullets[idx];
    const label = groupObj?.getObjects?.()?.[2];
    if (!label) return;
    label.set("text", value);
    canvas.renderAll();
    const updated = [...bullets];
    updated[idx] = { ...updated[idx], text: value };
    setBullets(updated);
    onChanged();
  }

  function deleteBullet(idx: number) {
    if (!canvas) return;
    canvas.remove(bullets[idx].groupObj);
    // Re-index remaining bullets
    const remaining = bullets.filter((_, i) => i !== idx);
    remaining.forEach(({ groupObj }, i) => {
      if (groupObj.data) groupObj.data.index = i;
      const num = groupObj.getObjects?.()?.[1];
      if (num) { num.set("text", String(i + 1)); }
    });
    canvas.renderAll();
    setBullets(remaining);
    onChanged();
  }

  if (bullets.length === 0) {
    return (
      <div className="p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">Bullets</p>
        <p className="text-xs text-zinc-600">No bullet items on this slide.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
        Bullets ({bullets.length})
      </p>
      {bullets.map(({ text }, idx) => (
        <Row key={idx} label={`${idx + 1}.`}>
          <div className="flex items-start gap-1.5 w-full">
            <textarea
              value={text}
              rows={2}
              onChange={e => updateBulletText(idx, e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              onClick={() => deleteBullet(idx)}
              className="mt-0.5 p-1 rounded text-zinc-600 hover:text-red-400 transition-colors shrink-0"
              title="Remove bullet"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </Row>
      ))}
      <div className="pt-1">
        <p className="text-[9px] text-zinc-600 flex items-center gap-1">
          <Plus size={9} />
          To add bullets, use the Templates panel → Bullet List
        </p>
      </div>
    </div>
  );
}
