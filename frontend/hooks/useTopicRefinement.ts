"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type { useDiscoverDrawer } from "@/hooks/useDiscoverDrawer";

type DiscoverDrawer = ReturnType<typeof useDiscoverDrawer>;
type DiscoverArticle = Parameters<DiscoverDrawer["selectArticle"]>[0];

export function useTopicRefinement(drawer: DiscoverDrawer) {
  const [topicLoading, setTopicLoading] = useState(false);
  const [refineHint, setRefineHint] = useState<"clean" | "crawl_failed" | null>(null);

  // Named without "use" prefix since it's a regular async function, not a hook
  async function applyArticleAsTopic(article: DiscoverArticle) {
    setRefineHint(null);
    setTopicLoading(true);
    try {
      await drawer.selectArticle(article);
      const result = await api.topicFromUrl({ url: article.url, title: article.title, snippet: article.snippet });
      setRefineHint(result.crawl_failed ? "crawl_failed" : "clean");
    } catch {
      setRefineHint("crawl_failed");
    } finally {
      setTopicLoading(false);
    }
  }

  return { topicLoading, refineHint, setRefineHint, applyArticleAsTopic };
}
