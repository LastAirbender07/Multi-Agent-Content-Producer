import { BASE } from "./client";

export interface AnalyticsKPIs {
  total_runs: number;
  total_slides: number;
  total_cost_usd: number;
  total_cost_inr: number;
  avg_cost_usd: number;
  avg_cost_inr: number;
  untracked_runs: number;
}

export interface StageTokenStats {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_inr: number;
  calls: number;
}

export interface TokenSeriesEntry {
  run_id: string;
  topic: string;
  total_tokens: number;
  cost_usd: number;
  cost_inr: number;
  by_stage: Record<string, number>;
}

export interface StageLatency {
  avg_s: number;
  min_s: number;
  max_s: number;
  samples: number;
}

export interface ResearchQualityEntry {
  run_id: string;
  topic: string;
  confidence: number;
  passed: boolean;
  evidence: number;
  cost_usd: number;
  slides: number;
}

export interface ResearchQuality {
  avg_confidence: number | null;
  quality_gate_rate: number | null;
  quality_gate_passed: number;
  runs_with_quality_data: number;
  distribution: ResearchQualityEntry[];
  run_status_counts: Record<string, number>;
  avg_evidence_count: number;
  avg_key_points: number;
  avg_gaps_found: number;
  avg_iterations: number;
}

export interface RunReadiness {
  run_id: string;
  topic: string;
  has_slides: boolean;
  has_images: boolean;
  has_captions: boolean;
  has_blog: boolean;
}

export interface AnalyticsSummary {
  computed_at?: string;
  kpis: AnalyticsKPIs;
  token_by_stage: Record<string, StageTokenStats>;
  token_series: TokenSeriesEntry[];
  topic_distribution: { category: string; count: number }[];
  activity: { date: string; count: number }[];
  model_breakdown: { model: string; cost_usd: number; cost_inr: number; calls: number }[];
  runs_with_token_data: number;
  stage_latency: Record<string, StageLatency>;
  research_quality: ResearchQuality;
  hook_distribution: { hook: string; count: number }[];
  slide_type_distribution: { type: string; count: number }[];
  image_source_distribution: { source: string; count: number }[];
  category_confidence: { category: string; avg_confidence: number; run_count: number }[];
  run_readiness: RunReadiness[];
  blog_count: number;
}

export const analytics = {
  getSummary: (): Promise<AnalyticsSummary> =>
    fetch(`${BASE}/analytics/summary`).then(r => r.json()),
};
