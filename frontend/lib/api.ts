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

export interface ChatBody {
  messages: { role: string; content: string }[];
  system?: string;
}

export interface ChatResponse {
  reply: string;
  error?: string;
}
