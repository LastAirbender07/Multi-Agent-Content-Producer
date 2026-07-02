// Satisfies `import { ... } from "@/lib/api"` in the renderer bundle.
// Re-exports only the types needed; no runtime API calls are made from the canvas builders.

export * from "../../frontend/lib/api/types";
