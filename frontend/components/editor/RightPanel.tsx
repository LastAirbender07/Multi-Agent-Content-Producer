"use client";
import type { SelectedObjectInfo } from "@/components/editor/FabricCanvas";
import { ChartEditorPanel } from "@/components/editor/ChartEditorPanel";
import { TextPropertyPanel } from "@/components/editor/panels/TextPropertyPanel";
import { ImagePropertyPanel } from "@/components/editor/panels/ImagePropertyPanel";
import { BulletsPropertyPanel } from "@/components/editor/panels/BulletsPropertyPanel";
import { CanvasPropertyPanel } from "@/components/editor/panels/CanvasPropertyPanel";
import type { ChartType, ChartData, ChartObjectData } from "@/types/chart";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

interface RightPanelProps {
  selectedObject: SelectedObjectInfo | null;
  canvas: FabricCanvas;
  onChanged: () => void;
  onChartApply?: (type: ChartType, data: ChartData) => Promise<void>;
}

export function RightPanel({ selectedObject, canvas, onChanged, onChartApply }: RightPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = canvas?.getActiveObject() ?? null;
  const objData = obj?.data as ChartObjectData | undefined;

  // Chart object — opens full chart editor
  if (objData?.role === "chart" && onChartApply) {
    return (
      <div className="w-72 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-hidden flex flex-col">
        <ChartEditorPanel
          compact
          initialType={objData.chartType}
          initialData={objData.chartData}
          theme={objData.theme ?? "aurora"}
          onApply={onChartApply}
        />
      </div>
    );
  }

  // Bullet item — show editable list for all bullets on the slide
  if (selectedObject?.role === "bullet_item") {
    return (
      <div className="w-56 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-y-auto custom-scrollbar flex flex-col">
        <BulletsPropertyPanel canvas={canvas} onChanged={onChanged} />
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-y-auto custom-scrollbar flex flex-col">
      {selectedObject?.type === "textbox" && obj ? (
        <TextPropertyPanel obj={obj} canvas={canvas} onChanged={onChanged} />
      ) : selectedObject?.type === "image" && obj ? (
        <ImagePropertyPanel obj={obj} canvas={canvas} onChanged={onChanged} />
      ) : (
        <CanvasPropertyPanel canvas={canvas} onChanged={onChanged} />
      )}
    </div>
  );
}
