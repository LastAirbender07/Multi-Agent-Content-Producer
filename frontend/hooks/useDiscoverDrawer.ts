"use client";
import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setTopic, setDiscoveryArticle, setDiscoverUrl, setFreshness } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";
import type { DiscoverArticle } from "@/lib/api";

export function useDiscoverDrawer(): {
  open: boolean;
  setOpen: (v: boolean) => void;
  articles: DiscoverArticle[];
  loading: boolean;
  filter: string;
  setFilter: (v: string) => void;
  load: (bust?: boolean) => Promise<void>;
  selectArticle: (article: DiscoverArticle) => Promise<void>;
} {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<DiscoverArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  async function load(bust = false) {
    setLoading(true);
    try {
      const res = await api.discoverTopics(bust);
      setArticles(res.articles);
    } catch {}
    finally { setLoading(false); }
  }

  async function selectArticle(article: DiscoverArticle) {
    setOpen(false);
    dispatch(setTopic(article.title));
    dispatch(setDiscoveryArticle({ title: article.title, snippet: article.snippet, url: article.url, category: article.category }));
    dispatch(setDiscoverUrl(article.url));

    try {
      const result = await api.topicFromUrl({ url: article.url, title: article.title, snippet: article.snippet });
      dispatch(setTopic(result.topic));
      dispatch(setFreshness(result.freshness as any));
    } catch {}
  }

  return { open, setOpen, articles, loading, filter, setFilter, load, selectArticle };
}
