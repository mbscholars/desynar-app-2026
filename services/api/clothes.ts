import { api } from './client';
import type {
  ClothesListResponse,
  ClothDetailResponse,
  LikeResponse,
  WalkVideoResponse,
} from './types';

const BASE = '/api/v1';

export const clothesApi = {
  /** List wears (catalog). Optional q for search. Public; send token if logged in for likes. */
  getList: (params?: { q?: string }) => {
    const query = params?.q?.trim()
      ? `?q=${encodeURIComponent(params.q.trim())}`
      : "";
    return api.get<ClothesListResponse>(`${BASE}/clothes${query}`, {
      requiresAuth: false,
    });
  },

  /** Single wear by ID. */
  getById: (id: number) =>
    api.get<ClothDetailResponse>(`${BASE}/clothes/${id}`, { requiresAuth: false }),

  /** Toggle like. Requires auth. */
  like: (id: number) =>
    api.post<LikeResponse>(`${BASE}/clothes/${id}/like`, undefined, {
      requiresAuth: true,
    }),

  /** AI walk video URL. 404 when not available. */
  getWalkVideo: (clothId: number) =>
    api.get<WalkVideoResponse>(`/api/v1/cloth-live/${clothId}/walk`, {
      requiresAuth: false,
    }),
};
