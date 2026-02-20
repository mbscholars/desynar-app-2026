/**
 * Profile API — current user info and account actions.
 * GET /api/v1/me, DELETE /api/v1/users/me (or equivalent backend routes).
 */

import { api } from "./client";
import { getSession } from "./session";

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar?: string | null;
  phone?: string | null;
  created_at?: string | null;
  role?: string;
}

export interface GetProfileResponse {
  data?: UserProfile;
  user?: UserProfile;
}

function isUserShape(d: unknown): d is UserProfile {
  return (
    d !== null &&
    typeof d === "object" &&
    "email" in d &&
    typeof (d as UserProfile).email === "string"
  );
}

/**
 * Fetch current user profile. Requires auth.
 * Tries GET /api/v1/me first; falls back to session data if available.
 */
export async function getProfile(): Promise<UserProfile | null> {
  try {
    const res = await api.get<GetProfileResponse>("/api/v1/me", {
      requiresAuth: true,
    });
    const user = res?.data ?? res?.user ?? null;
    if (isUserShape(user)) return user;
    return null;
  } catch {
    try {
      const session = await getSession();
      const data = session?.data;
      if (isUserShape(data)) return data;
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Delete current user account. Requires auth. Irreversible.
 * Backend: DELETE /api/v1/users/me (or POST /api/v1/account/delete).
 */
export async function deleteAccount(): Promise<void> {
  await api.delete<{ message?: string }>("/api/v1/users/me", {
    requiresAuth: true,
  });
}
