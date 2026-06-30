// ── All shared API types (mirrors backend Pydantic schemas) ──────────────────

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

export interface SeedEvidence {
  title: string;
  evidence: string;
  source_type: "discover" | "document" | "news" | "web_search" | "crawl" | "llm_knowledge";
  url?: string;
  source_name?: string;
  credibility_score?: number;
}

// ── Research ──────────────────────────────────────────────────────────────────

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
  best_iteration?: number;
  tool_traces: unknown[];
  skipped_tools: unknown[];
  degraded_flags: string[];
  errors: string[];
  output_path: string;
}

// ── Angles ────────────────────────────────────────────────────────────────────

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

// ── Content ───────────────────────────────────────────────────────────────────

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

// ── Editor ────────────────────────────────────────────────────────────────────

export interface RunSummary {
  run_id: string;
  topic: string;
  created_at: number;
  has_content: boolean;
  has_blog: boolean;
  starred?: boolean;
  tags?: string[];
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
  canvas_template?: string;
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
  id: string;
  fileName: string;
  charCount: number;
  fileType: string;
}

// ── Assets ────────────────────────────────────────────────────────────────────

export interface ImageLibraryItem {
  filename: string;
  url: string;
  path: string;
  slide_number?: number;
}

export interface ImageLibraryResponse {
  run_images: Record<string, ImageLibraryItem[]>;
  user_uploads: ImageLibraryItem[];
}

// ── Images ────────────────────────────────────────────────────────────────────

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

// ── News ──────────────────────────────────────────────────────────────────────

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

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatBody {
  messages: { role: string; content: string }[];
  system?: string;
}

export interface ChatResponse {
  reply: string;
  error?: string;
}
