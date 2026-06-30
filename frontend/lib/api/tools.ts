import { post, BASE } from "./client";
import type { NewsSearchBody, NewsSearchResponse, DiscoverResponse, TopicFromUrlBody, TopicFromUrlResponse, ChatBody, ChatResponse } from "./types";

export const tools = {
  searchNews: (body: NewsSearchBody) =>
    post<NewsSearchResponse>("/tools/news", body),

  discoverTopics: (bust = false): Promise<DiscoverResponse> =>
    fetch(`${BASE}/tools/news/discover${bust ? "?bust=1" : ""}`).then(r => r.json()),

  topicFromUrl: (body: TopicFromUrlBody) =>
    post<TopicFromUrlResponse>("/tools/topic-from-url", body),

  chat: (body: ChatBody) =>
    post<ChatResponse>("/chat/", body),
};
