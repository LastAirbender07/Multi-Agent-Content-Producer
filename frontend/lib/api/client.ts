// ── HTTP client utilities ─────────────────────────────────────────────────────

export const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000") + "/api/v1";

// Asset base (no /api/v1 suffix) — for image URLs, font files, brand assets
export const ASSET_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Standard timeout for quick API calls (metadata, saves, searches)
const TIMEOUT_MS = 30_000;

// Long timeout for pipeline operations that run LLM chains (research, angles, carousel)
// These can take 5–10 minutes. We use 15 minutes as a hard upper bound.
const LONG_TIMEOUT_MS = 15 * 60 * 1000;

export function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  // Pipeline run endpoints can take many minutes — use long timeout
  const isLongRunning = path.includes("/run") || path.includes("/pipeline") || path.includes("/regenerate");
  const res = await fetchWithTimeout(
    `${BASE}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    isLongRunning ? LONG_TIMEOUT_MS : TIMEOUT_MS,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function postMultipart<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  const r = await fetchWithTimeout(`${BASE}${path}`, { method: "POST", body: form });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
