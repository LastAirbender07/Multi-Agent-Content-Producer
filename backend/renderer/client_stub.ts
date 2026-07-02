// Satisfies `import { ASSET_BASE, BASE, ... } from "@/lib/api/client"` in the renderer bundle.
// The real values are injected at render time via options.imageBaseUrl.

export const BASE = "http://localhost:8000/api/v1";
export const ASSET_BASE = "http://localhost:8000";

export function fetchWithTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function postMultipart<T>(_path: string, _file: File): Promise<T> {
  throw new Error("postMultipart not available in renderer context");
}
