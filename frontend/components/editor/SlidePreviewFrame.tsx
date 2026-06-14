"use client";
import { useRef, useState, useEffect } from "react";

const BASE = "http://localhost:8000/api/v1";
const SLIDE_NATIVE_SIZE = 1080; // slides render at 1080×1080

interface SlidePreviewFrameProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  previewKey: number;
}

export function SlidePreviewFrame({ runId, angleIndex, slideNumber, previewKey }: SlidePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const src = `${BASE}/content/${runId}/slides/${angleIndex}/${slideNumber}/preview`;

  // Recalculate scale whenever container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const size = Math.min(el.offsetWidth, el.offsetHeight);
      setScale(size / SLIDE_NATIVE_SIZE);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 shadow-2xl shadow-black/50"
    >
      {/* iframe is always native 1080×1080, scaled down to fit container */}
      <iframe
        key={previewKey}
        src={src}
        title={`Slide ${slideNumber} preview`}
        style={{
          width: SLIDE_NATIVE_SIZE,
          height: SLIDE_NATIVE_SIZE,
          border: "none",
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          display: "block",
        }}
      />
    </div>
  );
}
