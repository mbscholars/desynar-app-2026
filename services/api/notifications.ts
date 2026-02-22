import { api, request } from "./client";

const BASE = "/api/v1";

export interface NotificationApiItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  subtitle?: string;
  route?: string;
  unread: boolean;
}

/** Response may be array (Option A) or { data: array } (Option B). */
type ListResponse = NotificationApiItem[] | { data: NotificationApiItem[] };

export interface UnreadCountResponse {
  count: number;
}

export const notificationsApi = {
  /**
   * List user's notifications (newest first). Requires auth.
   */
  getList: (params?: {
    limit?: number;
    offset?: number;
    unread_only?: boolean;
  }) => {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    if (params?.unread_only === true) search.set("unread_only", "1");
    const query = search.toString();
    const path = `${BASE}/notifications${query ? `?${query}` : ""}`;
    return api.get<ListResponse>(path, { requiresAuth: true }).then((res) => {
      if (Array.isArray(res)) return res;
      return (res as { data: NotificationApiItem[] }).data ?? [];
    });
  },

  /**
   * Unread count for badge. Requires auth.
   */
  getUnreadCount: () =>
    api.get<UnreadCountResponse>(`${BASE}/notifications/unread-count`, {
      requiresAuth: true,
    }),

  /**
   * Mark all as read. Requires auth.
   */
  readAll: () =>
    request<unknown>("PATCH", `${BASE}/notifications/read-all`, {
      requiresAuth: true,
    }),

  /**
   * Delete all notifications. Requires auth.
   */
  deleteAll: () =>
    api.delete<unknown>(`${BASE}/notifications`, { requiresAuth: true }),

  /**
   * Mark one notification as read. Requires auth.
   */
  markRead: (id: string) =>
    request<unknown>("PATCH", `${BASE}/notifications/${encodeURIComponent(id)}`, {
      requiresAuth: true,
    }),
};
