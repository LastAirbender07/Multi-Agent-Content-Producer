import { ASSET_BASE as BASE } from "@/lib/api/client";

const FONT_DEFS = [
  { family: "Syne",              weight: "700", path: "/assets/fonts/Syne-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "700", path: "/assets/fonts/PlusJakartaSans-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "600", path: "/assets/fonts/PlusJakartaSans-SemiBold.woff2" },
  { family: "Plus Jakarta Sans", weight: "400", path: "/assets/fonts/PlusJakartaSans-Regular.woff2" },
];

let _loaded = false;

export async function loadCanvasFonts(): Promise<void> {
  if (_loaded) return;
  // Non-fatal: font load failures degrade to system fallbacks — canvas still works
  await Promise.allSettled(FONT_DEFS.map(async ({ family, weight, path }) => {
    try {
      const face = new FontFace(family, `url(${BASE}${path})`, { weight });
      document.fonts.add(await face.load());
    } catch {
      // Font unavailable — system sans-serif used as fallback
    }
  }));
  _loaded = true;
}

// For testing / forced reload
export function resetFontCache(): void {
  _loaded = false;
}
