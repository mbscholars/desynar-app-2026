/**
 * Email/password auth — mirrors Vue auth API and desynar backend.
 * Endpoints: login, register, email verification (OTP), forgot password, reset password.
 */

import { api, request } from "./client";
import type { ApiErrorBody } from "./types";

const NO_AUTH = { requiresAuth: false } as const;

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success?: boolean;
  message?: string;
  token: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    name: string;
    role: string;
    avatar?: string;
  };
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export type ForgotPasswordPayload = { email: string };

export type VerifyPasswordResetPayload = {
  email: string;
  verification_token: string;
};

export type ResetPasswordPayload = {
  email: string;
  verification_token: string;
  password: string;
  password_confirmation: string;
};

export type VerifyEmailPayload = {
  email: string;
  verification_token: string;
};

/** POST /api/v1/auth/login — returns { token, user } or throws on invalid/email not verified. */
export async function emailLogin(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const res = await request<LoginResponse & { data?: LoginResponse }>(
    "POST",
    "/api/v1/auth/login",
    { ...NO_AUTH, body: { email: payload.email, password: payload.password } },
  );
  const data = res.token ? res : res.data;
  if (!data?.token) {
    const msg =
      (res as LoginResponse).message ??
      (res as { message?: string }).message ??
      "Login failed";
    throw new Error(msg);
  }
  return data;
}

/** POST /api/v1/users — register new user. */
export async function registerUser(
  payload: RegisterPayload,
): Promise<{ message?: string }> {
  return api.post<{ success?: boolean; message?: string }>(
    "/api/v1/users",
    {
      email: payload.email,
      password: payload.password,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone,
    },
    NO_AUTH,
  );
}

/** POST /api/v1/auth/forgot-password — send OTP to email. */
export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<{ message?: string }> {
  return api.post<{ success?: boolean; message?: string }>(
    "/api/v1/auth/forgot-password",
    { email: payload.email },
    NO_AUTH,
  );
}

/** POST /api/v1/auth/verify-account-password — verify OTP for password reset. */
export async function verifyPasswordResetOTP(
  payload: VerifyPasswordResetPayload,
): Promise<{ success?: boolean; message?: string }> {
  return api.post<{ success?: boolean; message?: string }>(
    "/api/v1/auth/verify-account-password",
    {
      email: payload.email,
      verification_token: payload.verification_token,
    },
    NO_AUTH,
  );
}

/** POST /api/v1/auth/password-reset — set new password after OTP verified. */
export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<{ message?: string }> {
  return api.post<{ success?: boolean; message?: string }>(
    "/api/v1/auth/password-reset",
    {
      email: payload.email,
      verification_token: payload.verification_token,
      password: payload.password,
      password_confirmation: payload.password_confirmation,
    },
    NO_AUTH,
  );
}

/** POST /api/v1/email-verification/verify — verify email OTP (e.g. after login requires verification). Returns token + user on success. */
export async function verifySentOTP(
  payload: VerifyEmailPayload,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse & { data?: LoginResponse }>(
    "/api/v1/email-verification/verify",
    {
      email: payload.email,
      verification_token: payload.verification_token,
    },
    NO_AUTH,
  );
  const data = res.token ? res : res.data;
  if (!data?.token) {
    const msg =
      (res as LoginResponse).message ??
      (res as { message?: string }).message ??
      "Verification failed";
    throw new Error(msg);
  }
  return data;
}

/** POST /api/v1/email-verification — resend email verification OTP. */
export async function resendEmailVerification(
  email: string,
): Promise<{ message?: string }> {
  return api.post<{ success?: boolean; message?: string }>(
    "/api/v1/email-verification",
    { email },
    NO_AUTH,
  );
}

/** Helper: get user-facing message from API error (status 420 = email not verified). */
export function isEmailVerificationError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    if ((err as { status: number }).status === 420) return true;
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.toLowerCase().includes("email not verified");
}

export function getApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: ApiErrorBody }).body;
    if (body?.message) return body.message;
    if (body?.errors && typeof body.errors === "object") {
      const parts = Object.entries(body.errors).map(([k, v]) =>
        Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v}`,
      );
      if (parts.length) return parts.join("; ");
    }
  }
  return err instanceof Error
    ? err.message
    : "Something went wrong. Please try again.";
}
