const BASE = "http://localhost:8000/api/v1";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Query refinement
  refineQuery: (topic: string) =>
    post<ProcessedQuery>("/tools/query-refine", { topic }),

  // Document parsing (multipart — NOT JSON)
  parseDoc: (file: File): Promise<ParseDocResponse> => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/tools/parse-doc`, { method: "POST", body: form })
      .then(async r => {
        if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t}`); }
        return r.json() as Promise<ParseDocResponse>;
      });
  },


  // Research
  runResearch: (body: ResearchRequestBody) =>
    post<ResearchResponse>("/research/run", body),
  llmDraftResearch: (body: { topic: string; context?: string; run_id?: string }) =>
    post<ResearchResponse>("/research/llm-draft", body),
  llmRefineResearch: (body: { topic: string; current_result: ResearchResponse; feedback: string }) =>
    post<ResearchResponse>("/research/llm-refine", body),

  // Angle
  runAngle: (body: AngleRequestBody) =>
    post<AngleResponse>("/angle/run", body),
  regenerateAngles: (body: AngleRequestBody) =>
    post<AngleResponse>("/angle/regenerate", body),
  selectAngles: (runId: string, indices: number[]) =>
    post<AngleResponse>(`/angle/${runId}/select`, { angle_indices: indices }),

  // Content
  runContent: (body: ContentRequestBody) =>
    post<ContentResponse>("/content/run", body),
  getBlogPostMd: (runId: string) =>
    fetch(`${BASE}/content/${runId}/blog-post`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); }),
  getBlogPostHtml: (runId: string) =>
    fetch(`${BASE}/content/${runId}/blog-post.html`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); }),

  // Editor — run browser
  getRunsList: (): Promise<{ runs: RunSummary[] }> =>
    fetch(`${BASE}/content/runs`).then(r => r.json()),
  getRunManifest: (runId: string): Promise<RunManifest> =>
    fetch(`${BASE}/content/${runId}/manifest`).then(r => r.json()),

  // Editor — slide data & editing
  getSlides: (runId: string, angleIndex: number): Promise<{ slides: SlideData[] }> =>
    fetch(`${BASE}/content/${runId}/slides/${angleIndex}`).then(r => r.json()),
  editSlide: (runId: string, angleIndex: number, slideNumber: number, body: SlideEditRequest): Promise<SlideEditResponse> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/edit`, body),
  aiRewriteSlide: (runId: string, angleIndex: number, slideNumber: number, feedback: string) =>
    post<{ slide: SlideData; message: string }>(`/content/${runId}/slides/${angleIndex}/${slideNumber}/ai-rewrite`, { feedback }),
  swapSlideImage: (runId: string, angleIndex: number, slideNumber: number, query: string, source: string): Promise<{ png_url: string }> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/swap-image`, { query, source }),
  newSlide: (runId: string, angleIndex: number, type: string, theme: string) =>
    post<{ slide: SlideData }>(`/content/${runId}/slides/${angleIndex}/new`, { type, theme }),

  // Editor — new blank run (no pipeline needed)
  createBlankRun: (topic: string): Promise<{ run_id: string; topic: string }> =>
    post("/content/new-blank-run", { topic }),

  // Editor — image management
  uploadSlideImage: async (runId: string, angleIndex: number, slideNumber: number, file: File): Promise<{ png_url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/content/${runId}/slides/${angleIndex}/${slideNumber}/upload-image`, { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  swapSlideImageUrl: (runId: string, angleIndex: number, slideNumber: number, url: string): Promise<{ png_url: string }> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/swap-image-url`, { url }),

  // Asset library
  getImageLibrary: (runId: string): Promise<ImageLibraryResponse> =>
    fetch(`${BASE}/content/assets/library?run_id=${encodeURIComponent(runId)}`).then(r => r.json()),
  uploadToLibrary: async (file: File): Promise<ImageLibraryItem> => {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/content/assets/upload`, { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteImage: async (path: string): Promise<{ deleted: boolean }> => {
    const r = await fetch(`${BASE}/content/assets/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // Canvas save/load
  saveCanvas: (runId: string, ai: number, sn: number, fabricJson: object): Promise<{ saved: boolean }> =>
    fetch(`${BASE}/content/${runId}/slides/${ai}/${sn}/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fabric_json: fabricJson }),
    }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),
  getCanvas: (runId: string, ai: number, sn: number): Promise<{ canvas_json: object | null; slide: SlideData | null }> =>
    fetch(`${BASE}/content/${runId}/slides/${ai}/${sn}/canvas`).then(r => r.json()),

  updateBlogPost: (runId: string, markdown: string) =>
    fetch(`${BASE}/content/${runId}/blog-post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown }),
    }).then(r => r.json()),

  // Images
  searchImages: (body: ImageSearchBody) =>
    post<ImageSearchResponse>("/tools/images", body),
  fetchImageTags: (query: string) =>
    post<{ tags: string[] }>("/tools/images/tags", { query }),
  downloadImages: (body: ImageDownloadBody) =>
    post<ImageDownloadResponse>("/tools/images/download", body),

  // News
  searchNews: (body: NewsSearchBody) =>
    post<NewsSearchResponse>("/tools/news", body),
  discoverTopics: (bust = false) =>
    fetch(`${BASE}/tools/news/discover${bust ? "?bust=1" : ""}`).then(r => r.json()) as Promise<DiscoverResponse>,
  topicFromUrl: (body: TopicFromUrlBody) =>
    post<TopicFromUrlResponse>("/tools/topic-from-url", body),

  // Chat
  chat: (body: ChatBody) => post<ChatResponse>("/chat/", body),
};

// ── Types (mirror backend Pydantic shapes) ───────────────────────────────────

export interface ProcessedQuery {
  cleaned_topic: string;
  entities: string[];
  search_queries: string[];
  freshness_hint: string;
  content_intent: string;
}

export interface BudgetConfig {
  max_tool_calls: number;
  max_sources: number;
  max_crawl_urls: number;
  max_refinement_loops: number;
  timeout_seconds: number;
}

export interface ResearchRequestBody {
  topic: string;
  mode: "quick" | "standard" | "deep";
  freshness: "breaking" | "recent" | "evergreen";
  run_id?: string;
  budget?: Partial<BudgetConfig>;
  explicit_urls?: string[];
  needs_claim_verification?: boolean;
  tool_selection_mode?: "auto" | "manual" | "hybrid";
  selected_tools?: string[];
  strict_tools?: boolean;
  preprocessed_queries?: string[];
  seeded_evidence?: SeedEvidence[];
}

export interface Evidence {
  evidence: string;
  source_type: string;
  title: string;
  url: string;
  snippet?: string;
  published_at?: string;
  source_name?: string;
  credibility_score: number;
  relevance_score: number;
}

export interface ResearchSynthesis {
  summary: string;
  key_points: string[];
  contradictions: string[];
  implications: string[];
  confidence_score: number;
  gaps: string[];
}

export interface EvaluationResult {
  passed: boolean;
  should_refine: boolean;
  reason: string;
  source_count: number;
  coverage_score: number;
  source_diversity_score: number;
  llm_content_score: number;
  source_score: number;
  combined_confidence: number;
}

export interface RoutePlan {
  selected_tools: string[];
  crawl_urls: string[];
  query_variants: string[];
  rationale: string[];
  selection_mode_used: string;
}

export interface ResearchResponse {
  run_id: string;
  status: string;
  topic: string;
  route_plan: RoutePlan;
  evidence: Evidence[];
  synthesis?: ResearchSynthesis;
  evaluation?: EvaluationResult;
  tool_traces: unknown[];
  skipped_tools: unknown[];
  degraded_flags: string[];
  errors: string[];
  output_path: string;
}

export interface Angle {
  statement: string;
  emotional_hook: string;
  supporting_evidence: string;
}

export interface AngleRequestBody {
  topic: string;
  synthesis: ResearchSynthesis;
  run_id?: string;
  mode: "auto" | "manual";
  max_angles_to_select?: number;
  exclude_statements?: string[];
}

export interface AngleResponse {
  run_id: string;
  status: string;
  angles: Angle[];
  selected_angles: Angle[];
  selection_reasoning: string;
  errors: string[];
  output_path: string;
}

export interface ContentRequestBody {
  run_id: string;
  topic: string;
  selected_angles: Angle[];
  research_summary: string;
  key_points?: string[];
  image_source?: "auto" | "pexels" | "ddgs";
  max_slides?: number;
  min_slides?: number;
}

export interface ContentResponse {
  run_id: string;
  status: string;
  angles_processed: number[];
  output_paths: string[];
  carousel_paths: string[][];
  captions: string[];
  hashtags_per_angle: string[][];
  errors: string[];
  blog_post_path: string;
  blog_post_html_path: string;
}

export interface ImageSearchBody {
  query: string;
  source: "pexels" | "ddgs";
  max_results?: number;
  queries?: string[];
}

export interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  width: number;
  height: number;
  src: Record<string, string>;
}

export interface DDGSImage {
  title: string;
  image: string;
  thumbnail?: string;
  url?: string;
  height?: number;
  width?: number;
  source?: string;
}

export interface ImageSearchResponse {
  success: boolean;
  query: string;
  source: string;
  total_results: number;
  pexels_photos: PexelsPhoto[];
  ddgs_images: DDGSImage[];
  error?: string;
}

export interface ImageDownloadBody {
  urls: string[];
  save_dir?: string;
}

export interface ImageDownloadResponse {
  saved_paths: string[];
  errors: { url: string; error: string }[];
  save_dir: string;
}

export interface NewsSearchBody {
  query: string;
  source: "google" | "newsapi" | "ddgs";
  max_results?: number;
  when?: string;
  days_back?: number;
}

export interface NewsArticle {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  source_name?: string;
  author?: string;
  published_at?: string;
  url_to_image?: string;
}

export interface NewsSearchResponse {
  success: boolean;
  query: string;
  source: string;
  total_results: number;
  articles: NewsArticle[];
  error?: string;
}

export interface DiscoverArticle {
  title: string;
  snippet: string;
  url: string;
  source_name: string;
  category: string;
  age_label: string;
  published_at?: string;
}

export interface DiscoverResponse {
  articles: DiscoverArticle[];
  cached: boolean;
}

export interface TopicFromUrlBody {
  url: string;
  title: string;
  snippet?: string;
}

export interface TopicFromUrlResponse {
  topic: string;
  freshness: string;
  entities: string[];
  crawl_failed: boolean;
}

export interface ChatBody {
  messages: { role: string; content: string }[];
  system?: string;
}

export interface ChatResponse {
  reply: string;
  error?: string;
}

export interface SeedEvidence {
  title: string;
  evidence: string;
  source_type: "discover" | "document" | "news" | "web_search" | "crawl" | "llm_knowledge";
  url?: string;
  source_name?: string;
  credibility_score?: number;
}

// ── Editor types ──────────────────────────────────────────────────────────────

export interface RunSummary {
  run_id: string;
  topic: string;
  created_at: number;   // Unix timestamp
  has_content: boolean;
  has_blog: boolean;
}

export interface AngleManifest {
  index: number;
  slide_count: number;
  png_paths: string[];
}

export interface RunManifest {
  run_id: string;
  topic: string;
  angles: AngleManifest[];
  has_blog: boolean;
}

export interface SlideData {
  slide_number: number;
  type: string;
  title: string;
  body: string;
  bullets: string[];
  stat_value?: string;
  stat_label?: string;
  chart_type?: string;
  chart_data?: { labels: string[]; values: number[]; datasets?: { label: string; values: number[] }[] };
  image_query?: string;
  slide_overrides: Record<string, string>;
  _theme?: string;
}

export interface SlideEditRequest {
  title?: string;
  body?: string;
  bullets?: string[];
  stat_value?: string;
  stat_label?: string;
  chart_data?: object;
  chart_type?: string;
  slide_overrides?: Record<string, string>;
  template_type?: string;
  theme?: string;
}

export interface SlideEditResponse {
  png_url: string;
  updated_at: string;
}

export interface ParseDocResponse {
  title: string;
  text: string;
  char_count: number;
  file_type: string;
}

export interface AttachedEvidence extends SeedEvidence {
  id: string;        // client-side UUID for list keying
  fileName: string;
  charCount: number;
  fileType: string;
}

// ── Asset library types ───────────────────────────────────────────────────────

export interface ImageLibraryItem {
  filename: string;
  url: string;
  path: string;
  slide_number?: number;
}

export interface ImageLibraryResponse {
  run_images: Record<string, ImageLibraryItem[]>; // key = "angle_0", "angle_1", etc.
  user_uploads: ImageLibraryItem[];
}
