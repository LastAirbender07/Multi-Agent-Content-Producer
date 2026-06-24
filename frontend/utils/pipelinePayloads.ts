import type { AttachedEvidence, SeedEvidence } from "@/lib/api";

// Minimal article shape needed to build seeded evidence — compatible with both
// the local DiscoveryArticle in pipelineSlice and the API DiscoverArticle.
interface ArticleForEvidence {
  title: string;
  snippet: string;
  url: string;
  category: string;
}

export function buildSeededEvidence(
  discoveryArticle: ArticleForEvidence | null,
  discoverUrl: string | null,
  attachedEvidence: AttachedEvidence[],
): SeedEvidence[] {
  const seededEvidence: SeedEvidence[] = [];

  if (discoveryArticle?.snippet && discoverUrl) {
    seededEvidence.push({
      title: discoveryArticle.title,
      evidence: discoveryArticle.snippet,
      source_type: "discover" as const,
      url: discoverUrl,
      source_name: discoveryArticle.category,
      credibility_score: 0.85,
    });
  }

  attachedEvidence.forEach(doc => seededEvidence.push({
    title: doc.title,
    evidence: doc.evidence,
    source_type: "document" as const,
    url: doc.url ?? "",
    source_name: doc.fileName,
    credibility_score: 0.9,
  }));

  return seededEvidence;
}
