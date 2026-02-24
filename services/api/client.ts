/**
 * API client for Desynar backend.
 * Base URL: EXPO_PUBLIC_API_BASE_URL (no trailing slash). Use https:// to avoid redirects;
 * RN fetch can convert POST to GET when following HTTP→HTTPS (301/302) redirects.
 * Auth: Bearer token from SecureStore (web_auth_token). Attach when present for customer routes.
 * @see mobile-app/API-AND-DATA.md
 */

import { getToken } from "@/services/authStorage";

import type { ApiErrorBody } from "./types";

function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  try {
    const Constants = require("expo-constants").default;
    const extra = Constants.expoConfig?.extra;
    if (extra?.apiBaseUrl) return extra.apiBaseUrl;
  } catch {
    // ignore
  }
  return "http://localhost:8000";
}

const BASE_URL = getBaseUrl();

/** Ensure base has no trailing slash; paths start with / */
function resolveUrl(path: string): string {
  const base = BASE_URL.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: object;
    formData?: FormData;
    requiresAuth?: boolean;
    /** When true, attach Bearer token if present (e.g. for public endpoints that personalize when logged in). */
    attachTokenIfPresent?: boolean;
  },
): Promise<T> {
  const url = resolveUrl(path);
  const shouldAttachToken =
    options?.requiresAuth !== false || options?.attachTokenIfPresent === true;
  const token = shouldAttachToken ? await getToken() : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options?.formData) {
    // Let browser set Content-Type with boundary for FormData
  } else if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  // Normalize method (fetch expects uppercase). POST must not follow redirects that turn it into GET (use HTTPS base URL).
  const normalizedMethod = method.toUpperCase();
  const bodyPayload =
    options?.formData !== undefined
      ? options.formData
      : options?.body !== undefined
        ? JSON.stringify(options.body)
        : undefined;

  const init: RequestInit = {
    method: normalizedMethod,
    headers,
    body: bodyPayload,
  };

  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // not json
    }
  }

  if (!res.ok) {
    const body = json as ApiErrorBody | undefined;
    const message =
      body?.message ||
      (body?.errors
        ? Object.entries(body.errors)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("; ")
        : undefined) ||
      `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, body);
  }

  return (json ?? {}) as T;
}

type RequestOptions = { requiresAuth?: boolean; attachTokenIfPresent?: boolean };

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),

  post: <T>(
    path: string,
    body?: object,
    options?: RequestOptions,
  ) => request<T>("POST", path, { ...options, body }),

  put: <T>(path: string, body?: object, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};
