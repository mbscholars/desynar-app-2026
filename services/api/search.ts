import { api } from "./client";

const BASE = "/api/v1";

export interface SearchSuggestion {
  id: string;
  text: string;
  highlighted?: boolean;
}

/** Response may be array (Option A) or { data: array } (Option B). */
type SuggestionsResponse = SearchSuggestion[] | { data: SearchSuggestion[] };

export const searchApi = {
  /**
   * Get "You may like" suggestions. Auth sent when logged in for personalized suggestions.
   */
  getSuggestions: (params?: { limit?: number; locale?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.locale) search.set("locale", params.locale);
    const query = search.toString();
    const path = `${BASE}/search/suggestions${query ? `?${query}` : ""}`;
    return api.get<SuggestionsResponse>(path).then((res) => {
      if (Array.isArray(res)) return res;
      return (res as { data: SearchSuggestion[] }).data ?? [];
    });
  },
};
