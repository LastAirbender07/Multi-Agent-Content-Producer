"use client";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Zap, PencilRuler } from "lucide-react";
import { useToolbarPosition } from "@/hooks/useToolbarPosition";
import { EditorLeftPanel } from "@/components/editor/EditorLeftPanel";
import { FabricCanvas } from "@/components/editor/FabricCanvas";
import { CanvasToolbar } from "@/components/editor/CanvasToolbar";
import { ContextToolbar } from "@/components/editor/ContextToolbar";
import { RightPanel } from "@/components/editor/RightPanel";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { SlidePngPreview } from "@/components/editor/SlidePngPreview";
import { api } from "@/lib/api";
import type { FabricCanvasAPI, SelectedObjectInfo } from "@/components/editor/FabricCanvas";
import type { Canvas as FabricCanvasType } from "fabric";
import { createChartObject } from "@/utils/canvasTemplates/chartRenderer";
import { getTokens } from "@/utils/canvasTokens";
import type { ChartType, ChartData } from "@/types/chart";

function EditorContent() {
  const params = useSearchParams();
  const router = useRouter();

  const runId = params.get("run") ?? null;
  const view = (params.get("view") ?? null) as "slide" | "blog" | null;
  const angleParam = params.get("angle");
  const slideParam = params.get("slide");
  const topicParam = params.get("topic") ?? "";

  const [selectedAngle, setSelectedAngle] = useState<number | null>(angleParam ? Number(angleParam) : null);
  const [selectedSlide, setSelectedSlide] = useState<number | null>(slideParam ? Number(slideParam) : null);
  const [selectedView, setSelectedView] = useState<"slide" | "blog" | null>(view);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runId);
  const [topic, setTopic] = useState(topicParam);
  const [browserCollapsed, setBrowserCollapsed] = useState(false);

  // Canvas state
  const canvasApiRef = useRef<FabricCanvasAPI | null>(null);
  const [selectedObject, setSelectedObject] = useState<SelectedObjectInfo | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "exported">("idle");
  const [zoom, setZoom] = useState(1);
  // Track current slide's theme so chart insertion uses the correct color palette
  const [slideTheme, setSlideTheme] = useState<"aurora" | "lumina">("aurora");
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [changeKey, setChangeKey] = useState(0); // used to force RightPanel re-evaluation
  // Track canvas instance for ContextToolbar + RightPanel
  const [canvasInstance, setCanvasInstance] = useState<FabricCanvasType | null>(null);

  function navigateTo(rid: string, v: "slide" | "blog", angle?: number, slide?: number) {
    const p = new URLSearchParams();
    p.set("run", rid);
    p.set("view", v);
    if (v === "slide" && angle !== undefined && slide !== undefined) {
      p.set("angle", String(angle));
      p.set("slide", String(slide));
    }
    router.push(`/editor?${p.toString()}`);
  }

  async function onSelectSlide(rid: string, angle: number, slide: number) {
    setSelectedRunId(rid);
    setSelectedAngle(angle);
    setSelectedSlide(slide);
    setSelectedView("slide");
    setSelectedObject(null);
    if (!topic || rid !== selectedRunId) {
      try {
        const m = await api.getRunManifest(rid);
        setTopic(m.topic);
      } catch {}
    }
    navigateTo(rid, "slide", angle, slide);
  }

  async function onSelectBlog(rid: string) {
    setSelectedRunId(rid);
    setSelectedView("blog");
    if (!topic || rid !== selectedRunId) {
      try {
        const m = await api.getRunManifest(rid);
        setTopic(m.topic);
      } catch {}
    }
    navigateTo(rid, "blog");
  }

  const handleCanvasChanged = useCallback(() => {
    setChangeKey(k => k + 1);
    setCanvasInstance(canvasApiRef.current?.getCanvas() ?? null);
  }, []);

  const handleSave = useCallback(async () => {
    const api_ = canvasApiRef.current;
    if (!api_ || !selectedRunId || selectedAngle === null || selectedSlide === null) return;
    setSaveStatus("saving");
    try {
      const json = api_.getCanvasJson();
      await api.saveCanvas(selectedRunId, selectedAngle, selectedSlide, json);
      // Clear checkpoint
      const cpKey = `canvas_cp_${selectedRunId}_${selectedAngle}_${selectedSlide}`;
      localStorage.removeItem(cpKey);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [selectedRunId, selectedAngle, selectedSlide]);

  const handleExportPng = useCallback(async () => {
    const api_ = canvasApiRef.current;
    if (!api_ || !selectedRunId || selectedAngle === null || selectedSlide === null) return;
    setExportStatus("exporting");
    try {
      const fields = api_.getTextFields();
      await api.editSlide(selectedRunId, selectedAngle, selectedSlide, {
        title: fields.title || undefined,
        body: fields.body || undefined,
        bullets: fields.bullets.length > 0 ? fields.bullets : undefined,
        stat_value: fields.stat_value || undefined,
        stat_label: fields.stat_label || undefined,
      });
      setExportStatus("exported");
      setTimeout(() => setExportStatus("idle"), 2000);
    } catch {
      setExportStatus("idle");
    }
  }, [selectedRunId, selectedAngle, selectedSlide]);

  // Keyboard shortcut: Ctrl+S → Save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // ContextToolbar positioning — hook converts canvas-space rect to screen coords
  const toolbarPos = useToolbarPosition(selectedObject, !!canvasApiRef.current);

  const [isEditMode, setIsEditMode] = useState(false);

  // Reset edit mode whenever the user navigates to a different slide
  useEffect(() => {
    setIsEditMode(false);
  }, [selectedRunId, selectedAngle, selectedSlide]);

  function enterEditMode() { setIsEditMode(true); }

  const showIdle = !selectedRunId || !selectedView;
  const showSlideEditor = selectedView === "slide" && selectedRunId && selectedAngle !== null && selectedSlide !== null;
  const showBlogEditor = selectedView === "blog" && selectedRunId;

  const handleChartApply = useCallback(async (type: ChartType, data: ChartData) => {
    const api_ = canvasApiRef.current;
    const canvas = api_?.getCanvas();
    if (!canvas || !api_) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;                       // nothing selected — bail before committing
    api_.commit("edit chart");                    // snapshot old state AFTER confirming target
    const tokens = getTokens(`${slideTheme}-hook`);
    const left   = (activeObj as { left?: number })?.left   ?? 64;
    const top    = (activeObj as { top?: number })?.top     ?? 300;
    const width  = (activeObj as { width?: number })?.width;
    const height = (activeObj as { height?: number })?.height;
    const newObj = await createChartObject(type, data, tokens, { left, top, width, height }, slideTheme);
    canvas.remove(activeObj);
    canvas.add(newObj);
    canvas.setActiveObject(newObj);
    canvas.renderAll();
    handleCanvasChanged();
  }, [handleCanvasChanged, slideTheme]);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Left panel (Files + Images tabs) */}
      <div
        className="shrink-0 transition-all duration-200 overflow-hidden"
        style={{ width: browserCollapsed ? 40 : 260 }}
      >
        <EditorLeftPanel
          selectedRunId={selectedRunId}
          selectedAngle={selectedAngle}
          selectedSlide={selectedSlide}
          selectedView={selectedView}
          onSelectSlide={onSelectSlide}
          onSelectBlog={onSelectBlog}
          collapsed={browserCollapsed}
          onToggleCollapse={() => setBrowserCollapsed(c => !c)}
          runId={selectedRunId}
          onImageApply={url => canvasApiRef.current?.applyImage(url)}
          onInsertChart={handleChartApply}
          onChartEditorOpen={() => {
            canvasApiRef.current?.getCanvas()?.discardActiveObject();
            canvasApiRef.current?.getCanvas()?.renderAll();
            setSelectedObject(null);
          }}
        />
      </div>

      {/* Editor area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Canvas toolbar — only in edit mode */}
        {showSlideEditor && isEditMode && (
          <CanvasToolbar
            topic={topic}
            angleIndex={selectedAngle!}
            slideNumber={selectedSlide!}
            canUndo={canUndo && !isViewOnly}
            canRedo={canRedo && !isViewOnly}
            onUndo={() => canvasApiRef.current?.undo()}
            onRedo={() => canvasApiRef.current?.redo()}
            onSave={handleSave}
            saveStatus={isViewOnly ? "idle" : saveStatus}
            onExportPng={handleExportPng}
            exportStatus={isViewOnly ? "idle" : exportStatus}
            zoom={zoom}
            onZoom={z => {
              const next = z === -1 ? 1 : Math.max(0.25, Math.min(2, z));
              setZoom(next);
            }}
          />
        )}

        {/* Blog editor header (kept from original) */}
        {showBlogEditor && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/40 bg-zinc-950 shrink-0">
            <PencilRuler size={16} className="text-violet-400" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-zinc-200 truncate">{topic || selectedRunId?.slice(0, 12) + "…"}</h1>
              <p className="text-[10px] text-zinc-600">Blog Post</p>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex">
          {showIdle && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <Zap size={28} className="text-zinc-700" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mb-2">Select a file</h2>
              <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                Browse your runs in the panel on the left, then click a slide or blog post to edit it.
              </p>
            </div>
          )}

          {showSlideEditor && (
            <>
              {/* Canvas wrapper (relative for ContextToolbar positioning) */}
              <div className="flex-1 relative overflow-hidden flex">
                {/* ── PNG Preview Mode (default) ── */}
                {!isEditMode && (
                  <SlidePngPreview
                    runId={selectedRunId!}
                    angleIndex={selectedAngle!}
                    slideNumber={selectedSlide!}
                    onEnterEditMode={enterEditMode}
                  />
                )}

                {/* ── Canvas Edit Mode ── */}
                {isEditMode && (
                  <>
                    <FabricCanvas
                      runId={selectedRunId!}
                      angleIndex={selectedAngle!}
                      slideNumber={selectedSlide!}
                      zoomLevel={zoom}
                      onObjectSelected={info => {
                        setSelectedObject(info);
                        setCanvasInstance(canvasApiRef.current?.getCanvas() ?? null);
                      }}
                      onCanvasChanged={handleCanvasChanged}
                      registerCanvasRef={api_ => {
                        canvasApiRef.current = api_;
                        setCanvasInstance(api_?.getCanvas() ?? null);
                      }}
                      onUndoRedoStateChange={(u, r) => { setCanUndo(u); setCanRedo(r); }}
                      onSlideLoaded={(theme, viewOnly) => { setSlideTheme(theme); setIsViewOnly(viewOnly); }}
                    />
                    {/* ContextToolbar — floats above selected object */}
                    {selectedObject && canvasInstance && toolbarPos && (
                      <ContextToolbar
                        selectedObject={selectedObject}
                        canvas={canvasInstance}
                        onChanged={handleCanvasChanged}
                        onCommit={label => canvasApiRef.current?.commit(label)}
                        onUngroup={() => canvasApiRef.current?.ungroup()}
                        style={{ position: "absolute", top: toolbarPos.top, left: toolbarPos.left }}
                      />
                    )}
                    {/* View-only banner for legacy runs */}
                    {isViewOnly && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-zinc-800/95 border border-zinc-600 rounded-xl px-4 py-2 text-xs text-zinc-400 shadow-xl backdrop-blur-sm pointer-events-none">
                        This carousel was generated before canvas editing was supported — view only.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right panel — only visible in edit mode */}
              {isEditMode && (
                <RightPanel
                  key={changeKey}
                  selectedObject={selectedObject}
                  canvas={canvasInstance}
                  onChanged={handleCanvasChanged}
                  onChartApply={handleChartApply}
                />
              )}
            </>
          )}

          {showBlogEditor && (
            <MarkdownEditor runId={selectedRunId!} topic={topic} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
