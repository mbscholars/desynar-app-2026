import { api } from "./client";

export interface SessionResponse {
  data?: unknown;
  roles?: string[];
  permissions?: string[];
}

/**
 * Validate current auth token with backend. Call on app load.
 * Returns session data if valid; throws or returns empty if not.
 */
export async function getSession(): Promise<SessionResponse> {
  return api.get<SessionResponse>("/api/v1/session", { requiresAuth: true });
}
