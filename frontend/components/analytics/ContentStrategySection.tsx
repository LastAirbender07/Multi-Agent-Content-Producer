/**
 * ContentStrategySection — Emotional Hooks, Slide Types, Image Sources (3-col grid).
 */
"use client";
import { Smile, Layers, Image } from "lucide-react";
import { Card, CardHeader, DistributionRow } from "./Card";

const HOOK_COLORS: Record<string, string> = {
  Anger: "bg-red-500", Hope: "bg-emerald-500", Curiosity: "bg-violet-500", FOMO: "bg-amber-500",
};

const SLIDE_TYPE_COLORS: Record<string, string> = {
  hook: "bg-violet-500", content: "bg-blue-500", stat: "bg-amber-500",
  quote: "bg-teal-500", cta: "bg-emerald-500", engage: "bg-pink-500",
};

const SRC_COLORS: Record<string, string> = {
  pexels: "bg-teal-500", ddgs: "bg-violet-500", colour: "bg-zinc-500", brand: "bg-amber-500",
};

export function ContentStrategySection({
  hooks,
  slideTypes,
  imageSources,
}: {
  hooks:        { hook: string; count: number }[];
  slideTypes:   { type: string; count: number }[];
  imageSources: { source: string; count: number }[];
}) {
  if (hooks.length === 0 && slideTypes.length === 0 && imageSources.length === 0) return null;

  const hookTotal  = hooks.reduce((s, h) => s + h.count, 0);
  const slideTotal = slideTypes.reduce((s, t) => s + t.count, 0);
  const srcTotal   = imageSources.reduce((s, i) => s + i.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {hooks.length > 0 && (
        <Card>
          <CardHeader icon={Smile} iconColor="bg-pink-600/10 border border-pink-500/20 text-pink-400" label="Emotional Hooks" />
          <div className="space-y-2">
            {hooks.map(({ hook, count }) => (
              <DistributionRow
                key={hook}
                label={hook}
                count={count}
                total={hookTotal}
                colorClass={HOOK_COLORS[hook] ?? "bg-zinc-500"}
              />
            ))}
          </div>
        </Card>
      )}

      {slideTypes.length > 0 && (
        <Card>
          <CardHeader icon={Layers} iconColor="bg-blue-600/10 border border-blue-500/20 text-blue-400" label="Slide Types" />
          <div className="space-y-2">
            {slideTypes.map(({ type, count }) => (
              <DistributionRow
                key={type}
                label={type}
                count={count}
                total={slideTotal}
                colorClass={SLIDE_TYPE_COLORS[type] ?? "bg-zinc-500"}
                showPct
              />
            ))}
          </div>
        </Card>
      )}

      {imageSources.length > 0 && (
        <Card>
          <CardHeader icon={Image} iconColor="bg-teal-600/10 border border-teal-500/20 text-teal-400" label="Image Sources" />
          <div className="space-y-2">
            {imageSources.map(({ source, count }) => (
              <DistributionRow
                key={source}
                label={source}
                count={count}
                total={srcTotal}
                colorClass={SRC_COLORS[source] ?? "bg-zinc-500"}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
