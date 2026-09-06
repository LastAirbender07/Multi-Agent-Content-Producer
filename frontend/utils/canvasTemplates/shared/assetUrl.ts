import { ASSET_BASE } from "@/lib/api/client";

/**
 * Resolves a raw image URL or backend-relative path to a fully-qualified URL.
 *
 * - Full URLs  (http/https/data:)  → returned as-is
 * - Backend paths (starting with /) → prepended with ASSET_BASE (e.g. http://localhost:8000)
 * - Empty string / null / undefined → returns null
 *
 * Use this in every template builder before passing a URL to FabricImage.fromURL.
 * Centralises the ASSET_BASE prepend so it never gets duplicated across builders.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")   ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  if (url.startsWith("/")) return `${ASSET_BASE}${url}`;
  return url;
}
