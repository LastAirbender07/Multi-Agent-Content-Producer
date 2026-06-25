"use client";
import { useRef, useState, useEffect } from "react";

import { BASE } from "@/lib/api/client";
const SLIDE_NATIVE_SIZE = 1080;

interface SlidePreviewFrameProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  previewKey: number;
  onElementClick?: (field: "title" | "body" | "bullet" | "image") => void;
}

export function SlidePreviewFrame({
  runId, angleIndex, slideNumber, previewKey, onElementClick,
}: SlidePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const src = `${BASE}/content/${runId}/slides/${angleIndex}/${slideNumber}/preview`;

  // Scale iframe to fit container
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

  // Listen for postMessage from the iframe's embedded click-detection script
  useEffect(() => {
    if (!onElementClick) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "SLIDE_ELEMENT_CLICK") {
        onElementClick(e.data.field as "title" | "body" | "bullet" | "image");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onElementClick]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 shadow-2xl shadow-black/50"
    >
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
