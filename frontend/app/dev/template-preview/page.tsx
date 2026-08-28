"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { buildAuroraCarouselCoverHeroPhone }  from "@/utils/canvasTemplates/aurora_carousel_cover_hero_phone";
import { buildAuroraCarouselCoverHeroImages } from "@/utils/canvasTemplates/aurora_carousel_cover_hero_images";
import { loadCanvasFonts } from "@/utils/canvasFonts";

const W = 1080, H = 1350;

const PHONE_SLIDE = {
  canvas_template: "aurora-carousel-cover-hero-phone",
  type: "hook",
  _theme: "aurora",
  cover_hero: {
    category_pill: "VIRAL REEL",
    headline: "FAKE POST",
    body_text:
      "Create a 'Fake Post' within a reel to capture people's attention and stop the scroll!\n\nYou could even use this just on your opening shot if you don't want to use it as a whole video",
    cta_line: '*Comment "TEMPLATE" for the Canva Link',
    screen_image_url: "http://localhost:8000/assets/dev/phone-screen.jpg",
    overlay_cards: [
      { author: "@holler.academy", body: "Canva templates & content trends",             avatar_color: "#FFB4C4" },
      { author: "@holler.academy", body: "Here's an example of how you could use this", avatar_color: "#B4D9FF" },
    ],
  },
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const IMAGES_SLIDE = {
  canvas_template: "aurora-carousel-cover-hero-images",
  type: "hook",
  _theme: "aurora",
  cover_hero: {
    category_pill: "VIRAL DESIGN",
    headline: "GOOGLE,\nWHERE AM I?",
    body_text:
      "Unique edits are making posts go VIRAL on Instagram right now!\n\nInstead of just sharing a holiday shot, why not make it look like a Google Search Result?",
    cta_line: '*Comment "TEMPLATE" for the Canva Link',
    image_urls: [
      "http://localhost:8000/assets/dev/tablet-scene-1.jpg",
      "http://localhost:8000/assets/dev/tablet-scene-2.jpg",
    ],
  },
} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const DUMMY_META = { slideNum: 1, totalSlides: 5, logoUrl: "", brandName: "" };
const DUMMY_TOKENS = {} as any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function mountTemplate(
  el: HTMLCanvasElement,
  builder: (s: any, img: any, t: any, m: any) => Promise<fabric.FabricObject[]>,
  slide: any,
) {
  const fc = new fabric.Canvas(el, {
    width: W, height: H,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
  });
  const objects = await builder(slide, null, DUMMY_TOKENS, DUMMY_META);
  objects.forEach(obj => fc.add(obj));
  fc.requestRenderAll();
  el.setAttribute("data-render-complete", "true");
  return fc;
}

export default function TemplatePreviewPage() {
  const ref1 = useRef<HTMLCanvasElement>(null);
  const ref2 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref1.current || !ref2.current) return;
    let fc1: fabric.Canvas | null = null, fc2: fabric.Canvas | null = null;
    let cancelled = false;

    (async () => {
      try {
        await loadCanvasFonts();
        await document.fonts.ready;
        if (cancelled) return;
        fc1 = await mountTemplate(ref1.current!, buildAuroraCarouselCoverHeroPhone, PHONE_SLIDE);
        if (cancelled) return;
        fc2 = await mountTemplate(ref2.current!, buildAuroraCarouselCoverHeroImages, IMAGES_SLIDE);
      } catch (e) {
        console.error("[template-preview]", e);
      }
    })();

    return () => { cancelled = true; fc1?.dispose(); fc2?.dispose(); };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@1,700&display=swap" />
      <div style={{ display: "flex", gap: 24, padding: 24, background: "#111", overflowX: "auto", minHeight: "100vh", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "#aaa", fontFamily: "sans-serif", marginBottom: 8, fontSize: 13 }}>aurora-carousel-cover-hero-phone</p>
          <canvas ref={ref1} style={{ display: "block" }} />
        </div>
        <div>
          <p style={{ color: "#aaa", fontFamily: "sans-serif", marginBottom: 8, fontSize: 13 }}>aurora-carousel-cover-hero-images</p>
          <canvas ref={ref2} style={{ display: "block" }} />
        </div>
      </div>
    </>
  );
}
