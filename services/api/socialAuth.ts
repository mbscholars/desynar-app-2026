/**
 * Social (Google) auth for mobile — mirrors Vue SocialAuthService.
 * 1. Get OAuth URL from backend (with optional mobile redirect_uri).
 * 2. Open URL in in-app browser; backend redirects to redirect_uri with token (or code).
 * 3. Parse result and return token for login.
 *
 * Backend must redirect to: https://auth.expo.io/@OWNER/SLUG?token=JWT
 * (exactly that query param). If backend redirects without ?token=, Expo shows
 * "Something went wrong trying to finish signing in."
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { api } from "./client";

const OAUTH_STATE_KEY = "oauth_state";

export type OAuthUrlResponse = {
  success: boolean;
  data: {
    oauth_url: string;
    state: string;
  };
  message?: string;
};

export type SocialLoginResponse = {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      name: string;
      role: string;
      avatar?: string;
      provider?: string;
      provider_id?: string;
    };
    is_new_user?: boolean;
  };
};

/**
 * Build Expo Auth proxy URL from app config. Backend must redirect here with ?token= after Google callback.
 * Format: https://auth.expo.io/@OWNER/SLUG — OWNER must match your Expo account (username or org slug).
 * Set "owner" in app.json to the same value as your Expo dashboard (e.g. "desynar-innovation-ltd").
 */
function getExpoAuthRedirectUri(): string {
  const owner = Constants.expoConfig?.owner ?? "desynar";
  const slug = Constants.expoConfig?.slug ?? "desynar";
  return `https://auth.expo.io/@${owner}/${slug}`;
}

/**
 * Get redirect URI for the app so the backend can redirect here after OAuth.
 * Uses Expo auth proxy so the in-app browser can capture the redirect and return to the app.
 */
export function getRedirectUri(): string {
  return getExpoAuthRedirectUri();
}

/**
 * Fetch Google OAuth URL from backend. Pass redirect_uri for mobile so backend
 * can redirect to the app with token after callback.
 */
export async function getGoogleOAuthUrl(
  redirectUri?: string,
): Promise<{ oauth_url: string; state: string }> {
  const params = new URLSearchParams({ provider: "google" });
  if (redirectUri) params.set("redirect_uri", redirectUri);
  console.debug(
    "[socialAuth] requesting oauth-url with redirect_uri (app deep link):",
    redirectUri ?? "(none)",
  );
  const res = await api.get<OAuthUrlResponse>(
    `/api/v1/auth/social/app/oauth-url?${params.toString()}`,
    { requiresAuth: false },
  );
  console.debug(
    "[socialAuth] oauth-url response:",
    JSON.stringify(res, null, 2),
  );
  if (!res.success || !res.data?.oauth_url) {
    throw new Error(res.message || "Failed to get Google OAuth URL");
  }
  const state = res.data.state != null ? String(res.data.state) : "";
  return { oauth_url: res.data.oauth_url, state };
}

/**
 * Exchange code for token via backend (when backend redirects with code instead of token).
 * Uses POST so code/state are not logged in URL.
 */
export async function exchangeGoogleCallback(
  code: string,
  state: string,
): Promise<SocialLoginResponse["data"]> {
  const res = await api.post<SocialLoginResponse>(
    "/api/v1/auth/social/google/callback",
    { code, state },
    { requiresAuth: false },
  );
  console.debug(
    "[socialAuth] google/callback response:",
    JSON.stringify(
      {
        success: res.success,
        hasToken: !!res.data?.token,
        hasUser: !!res.data?.user,
      },
      null,
      2,
    ),
  );
  if (!res.success || !res.data?.token) {
    throw new Error(res.message || "Failed to complete Google sign-in");
  }
  return res.data;
}

/**
 * Initiate Google sign-in: open in-app browser, then parse redirect for token (or code).
 * Returns the app JWT token to pass to auth context login(token).
 */
export async function signInWithGoogle(): Promise<string> {
  const redirectUri = getRedirectUri();
  const { oauth_url, state } = await getGoogleOAuthUrl(redirectUri);
  await AsyncStorage.setItem(OAUTH_STATE_KEY, state);

  const result = await WebBrowser.openAuthSessionAsync(oauth_url, redirectUri);

  if (result.type === "cancel" || result.type === "dismiss") {
    await AsyncStorage.removeItem(OAUTH_STATE_KEY);
    throw new Error("Sign-in was cancelled");
  }
  if (result.type !== "success" || !result.url) {
    await AsyncStorage.removeItem(OAUTH_STATE_KEY);
    throw new Error("Sign-in did not return a valid result");
  }

  const url = result.url;
  const params = parseRedirectParams(url);
  // Debug: log redirect URL with token redacted (helps verify backend sent ?token=)
  const safeUrl = url.replace(/([?&])token=[^&]*/g, "$1token=***");
  console.debug("[socialAuth] redirect URL received:", safeUrl);
  const token = params.get("token");
  const code = params.get("code");
  const stateFromUrl = params.get("state");

  if (token) {
    await AsyncStorage.removeItem(OAUTH_STATE_KEY);
    return token;
  }
  if (code && stateFromUrl) {
    const storedState = await AsyncStorage.getItem(OAUTH_STATE_KEY).catch(
      () => null,
    );
    await AsyncStorage.removeItem(OAUTH_STATE_KEY);
    if (storedState && storedState !== stateFromUrl) {
      throw new Error("Invalid state returned from sign-in");
    }
    const data = await exchangeGoogleCallback(code, stateFromUrl);
    return data.token;
  }

  await AsyncStorage.removeItem(OAUTH_STATE_KEY);

  const error = params.get("error") || params.get("error_description");
  if (error) throw new Error(decodeURIComponent(error));
  throw new Error("Sign-in completed but no token or code was returned");
}

/** Parse query params from redirect URL (works with custom schemes like desynar://). */
function parseRedirectParams(url: string): Map<string, string> {
  const map = new Map<string, string>();
  const q = url.indexOf("?");
  if (q === -1) return map;
  const search = url.slice(q + 1);
  search.split("&").forEach((pair) => {
    const eq = pair.indexOf("=");
    if (eq === -1) return;
    const key = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, " "));
    const value = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
    map.set(key, value);
  });
  return map;
}
