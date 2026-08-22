/**
 * window.Renderer public API contract.
 *
 * Playwright and the Next.js editor are consumers of this interface — they
 * never import Fabric.js, the REGISTRY, fonts, or image utilities directly.
 * All rendering internals are encapsulated behind this boundary.
 *
 * Usage (Playwright):
 *   await page.evaluate(async (args) => {
 *     await window.Renderer.render(args.slide, args.options);
 *   }, { slide: slideJson, options: { imageBaseUrl: "http://localhost:8000" } });
 *   await page.screenshot({ path: outputPath });
 *
 * Usage (editor):
 *   await window.Renderer.render(slideData, { imageBaseUrl: "/api" });
 */

export interface RenderOptions {
  /** Base URL for asset resolution — fonts, images, logo. E.g. "http://localhost:8000" */
  imageBaseUrl:  string;
  totalSlides?:  number;
  brandName?:    string;
}

export interface SlideInput {
  slide_number?:    number;
  type?:            string;
  canvas_template?: string;
  image_url?:       string;
  _theme?:          string;
  slide_overrides?: Record<string, string>;
  [key: string]: unknown;
}

export interface RendererAPI {
  /**
   * Render a single slide onto the #slide canvas element.
   * Idempotent — safe to call repeatedly; disposes previous render automatically.
   */
  render(slide: SlideInput, options: RenderOptions): Promise<void>;

  /**
   * Load a previously-saved Fabric.js canvas JSON directly and paint it to the #slide canvas.
   * Bypasses the template builder — the JSON is the authoritative representation.
   *
   * Used by the editor Save flow: after the user edits the canvas, we serialize
   * canvas.toJSON(["data"]) and post it to /canvas. Backend then screenshots the
   * result via this method — the exact same visual state the user saw.
   *
   * @param fabricJson  Output of `fabric.Canvas.toJSON(["data"])`
   * @param options     Same shape as render(); imageBaseUrl resolves relative image srcs
   */
  renderFromCanvasJson(fabricJson: Record<string, unknown>, options: RenderOptions): Promise<void>;

  /**
   * Pre-load fonts so the first render() call has no font flash.
   * Called automatically by render() — call explicitly only if you need fonts
   * guaranteed before the first render (e.g. editor startup).
   */
  loadFonts(baseUrl: string): Promise<void>;
}

declare global {
  interface Window {
    Renderer: RendererAPI;
  }
}
