// ── Re-export everything so existing `import { api } from "@/lib/api"` works unchanged ──

export * from "./types";
export * from "./analytics";
export * from "./settings";
export { BASE, fetchWithTimeout, post, postMultipart } from "./client";

import { research } from "./research";
import { angles } from "./angles";
import { content } from "./content";
import { editor } from "./editor";
import { assets } from "./assets";
import { tools } from "./tools";
import { analytics } from "./analytics";
import { settings } from "./settings";

// Flat api object — preserves all existing call sites (api.runResearch, api.editSlide, etc.)
export const api = {
  ...research,
  ...angles,
  ...content,
  ...editor,
  ...assets,
  ...tools,
  ...analytics,
  ...settings,
};
