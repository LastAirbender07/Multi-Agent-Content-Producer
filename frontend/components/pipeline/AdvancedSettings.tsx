"use client";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setMaxTools, setMaxSources, setMaxLoops, setMaxSlides, setMinSlides,
  setMaxCrawlUrls, setMaxAnglesSelect, setNeedsClaimVerification, setImageSource,
} from "@/store/slices/pipelineSlice";
import { Stepper, SettingRow, ToggleRow, SectionHead } from "./SettingsPrimitives";

const IMAGE_OPTIONS = [
  { value: "auto" as const, label: "Auto" },
  { value: "pexels" as const, label: "Pexels" },
  { value: "ddgs" as const, label: "Web images" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdvancedSettings({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const {
    maxTools, maxSources, maxLoops, maxSlides, minSlides,
    maxCrawlUrls, maxAnglesSelect, needsClaimVerification, imageSource,
  } = useAppSelector((s) => s.pipeline);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="settings"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="border-t border-zinc-800/50 px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Advanced Configuration
              </p>
              <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8">
              {/* Left — research */}
              <div>
                <SectionHead>Research Budget</SectionHead>
                <div className="divide-y divide-zinc-800/50">
                  <SettingRow label="Max tool calls" hint="API calls per research run">
                    <Stepper value={maxTools} min={1} max={20} onChange={(v) => dispatch(setMaxTools(v))} />
                  </SettingRow>
                  <SettingRow label="Max sources" hint="Evidence items to collect">
                    <Stepper value={maxSources} min={5} max={40} onChange={(v) => dispatch(setMaxSources(v))} />
                  </SettingRow>
                  <SettingRow label="Max refinement loops" hint="Self-critique iterations">
                    <Stepper value={maxLoops} min={1} max={5} onChange={(v) => dispatch(setMaxLoops(v))} />
                  </SettingRow>
                  <SettingRow label="Max crawl URLs" hint="Web pages to read in depth">
                    <Stepper value={maxCrawlUrls} min={0} max={10} onChange={(v) => dispatch(setMaxCrawlUrls(v))} />
                  </SettingRow>
                </div>

                <SectionHead>Research Options</SectionHead>
                <div className="divide-y divide-zinc-800/50">
                  <ToggleRow
                    label="Claim verification"
                    hint="Cross-check facts against multiple sources"
                    checked={needsClaimVerification}
                    onChange={(v) => dispatch(setNeedsClaimVerification(v))}
                  />
                </div>
              </div>

              {/* Right — content */}
              <div>
                <SectionHead>Content Generation</SectionHead>
                <div className="divide-y divide-zinc-800/50">
                  <SettingRow label="Max angles to select" hint="How many content angles to produce">
                    <Stepper value={maxAnglesSelect} min={1} max={8} onChange={(v) => dispatch(setMaxAnglesSelect(v))} />
                  </SettingRow>
                  <SettingRow label="Slides per carousel" hint={`Min ${minSlides} – Max ${maxSlides}`}>
                    <div className="flex items-center gap-2">
                      <Stepper value={minSlides} min={2} max={maxSlides} onChange={(v) => dispatch(setMinSlides(v))} />
                      <span className="text-zinc-600 text-xs">–</span>
                      <Stepper value={maxSlides} min={minSlides} max={20} onChange={(v) => dispatch(setMaxSlides(v))} />
                    </div>
                  </SettingRow>
                  <SettingRow label="Image source" hint="Where to fetch carousel images from">
                    <div className="flex gap-0.5 p-0.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                      {IMAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => dispatch(setImageSource(opt.value))}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            imageSource === opt.value
                              ? "bg-zinc-700 text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
