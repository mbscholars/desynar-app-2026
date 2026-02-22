/**
 * Virtual Try-On API — FASHN v1.6 (async job).
 * Submit: POST /v1/ai/virtual-try-on → 202 with request_id.
 * Poll: GET /v1/ai/jobs/{request_id}?type=virtual_tryon until completed or failed.
 * Auth: Sanctum (Authorization: Bearer <token>).
 */

import { request, ApiError } from "./client";

const VIRTUAL_TRY_ON_PATH = "/api/v1/ai/virtual-try-on";
const AI_JOBS_PATH = "/api/v1/ai/jobs";
const VIRTUAL_TRY_ON_JOB_TYPE = "virtual_tryon";

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 60; // ~5 minutes at 5s interval

/** Progress update for UI during try-on. */
export type TryOnQueueUpdate = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: { message: string }[];
};

export type TryOnCategory = "auto" | "tops" | "bottoms" | "one-pieces";
export type TryOnMode = "performance" | "balanced" | "quality";
export type TryOnGarmentPhotoType = "auto" | "model" | "flat-lay";
export type TryOnModerationLevel = "none" | "permissive" | "conservative";
export type TryOnOutputFormat = "png" | "jpeg";

export interface TryOnGenerateInput {
  /** Model/body photo: public URL or base64 data URI (e.g. data:image/png;base64,...). */
  model_image: string;
  /** Garment/outfit photo: public URL or base64 data URI. */
  garment_image: string;
  /** Optional: server-side measurement profile ID (integer); not sent to API. */
  measurement_profile_id?: number;
  /** Optional: product ID; not sent to API. */
  product_id?: number;
  category?: TryOnCategory;
  mode?: TryOnMode;
  garment_photo_type?: TryOnGarmentPhotoType;
  moderation_level?: TryOnModerationLevel;
  seed?: number;
  /** Number of images to generate (1–4). Default 1. */
  num_samples?: number;
  /** Default true. */
  segmentation_free?: boolean;
  output_format?: TryOnOutputFormat;
}

export interface TryOnImageResult {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

export interface TryOnGenerateResponse {
  success: boolean;
  data?: { images: TryOnImageResult[] };
  error?: string;
}

/** 202 response from POST /v1/ai/virtual-try-on. */
interface VirtualTryOnSubmitResponse {
  success: boolean;
  data: {
    request_id: string;
  };
}

/** 200 response from GET /v1/ai/jobs/{request_id}?type=virtual_tryon. */
interface VirtualTryOnJobStatusResponse {
  success: boolean;
  data: {
    status: "processing" | "completed" | "failed";
    image_urls?: string[];
    error?: string;
  };
}

/** 400/404 error body. */
interface ApiErrorBody {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
}

/** Build JSON body for virtual-try-on (only fields supported by the endpoint). */
function buildVirtualTryOnBody(input: TryOnGenerateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model_image: input.model_image,
    garment_image: input.garment_image,
  };
  if (input.category != null) body.category = input.category;
  if (input.mode != null) body.mode = input.mode;
  if (input.garment_photo_type != null)
    body.garment_photo_type = input.garment_photo_type;
  if (input.moderation_level != null)
    body.moderation_level = input.moderation_level;
  if (input.seed != null) body.seed = input.seed;
  if (input.num_samples != null) body.num_samples = input.num_samples;
  if (input.segmentation_free != null)
    body.segmentation_free = input.segmentation_free;
  if (input.output_format != null) body.output_format = input.output_format;
  return body;
}

function imageUrlsToResults(urls: string[]): TryOnImageResult[] {
  return (urls ?? []).map((url) => ({ url }));
}

/**
 * Generate try-on image(s) via async job: submit then poll until completed or failed.
 * Submit: POST /v1/ai/virtual-try-on → 202 with request_id.
 * Poll: GET /v1/ai/jobs/{request_id}?type=virtual_tryon every 5 seconds.
 */
export async function tryOnGenerate(
  input: TryOnGenerateInput,
  onProgress?: (update: TryOnQueueUpdate) => void,
): Promise<TryOnGenerateResponse> {
  onProgress?.({
    status: "IN_PROGRESS",
    logs: [{ message: "Creating virtual try-on..." }],
  });

  try {
    const body = buildVirtualTryOnBody(input);
    console.debug("[TryOn] Submitting POST", VIRTUAL_TRY_ON_PATH, {
      model_image: input.model_image,
      garment_image: input.garment_image,
      category: input.category,
      mode: input.mode,
      num_samples: input.num_samples,
    });
    const submitRes = await request<VirtualTryOnSubmitResponse>(
      "POST",
      VIRTUAL_TRY_ON_PATH,
      {
        body,
        requiresAuth: true,
      },
    );
    const requestId = submitRes?.data?.request_id;
    console.debug("[TryOn] Submit response", { data: submitRes, request_id: requestId });

    if (!requestId) {
      onProgress?.({ status: "FAILED", logs: [{ message: "Try-on could not be started." }] });
      return { success: false, error: "Try-on could not be started." };
    }

    onProgress?.({
      status: "IN_QUEUE",
      logs: [{ message: "Waiting in queue..." }],
    });
    console.debug("[TryOn] Polling request_id:", requestId);

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let statusRes: VirtualTryOnJobStatusResponse;
      try {
        statusRes = await request<VirtualTryOnJobStatusResponse>(
          "GET",
          `${AI_JOBS_PATH}/${encodeURIComponent(requestId)}?type=${VIRTUAL_TRY_ON_JOB_TYPE}`,
          { requiresAuth: true },
        );
      } catch (pollErr) {
        const err = pollErr as { status?: number; body?: unknown };
        console.debug("[TryOn] Poll error", {
          attempt: attempt + 1,
          status: pollErr instanceof ApiError ? pollErr.status : err?.status,
          body: pollErr instanceof ApiError ? pollErr.body : err?.body,
        });
        if (pollErr instanceof ApiError && pollErr.status === 404) {
          const resBody = pollErr.body as ApiErrorBody | undefined;
          const msg = resBody?.error?.message ?? "Job not found.";
          onProgress?.({ status: "FAILED", logs: [{ message: msg }] });
          return { success: false, error: msg };
        }
        throw pollErr;
      }

      const payload = statusRes?.data;
      const status = payload?.status;
      const imageUrls = payload?.image_urls ?? [];
      const jobError = payload?.error;
      console.debug("[TryOn] Poll response", {
        attempt: attempt + 1,
        status,
        image_urls_count: imageUrls?.length ?? 0,
        image_urls: imageUrls,
        error: jobError,
      });

      if (status === "completed") {
        const images = imageUrlsToResults(imageUrls);
        onProgress?.({ status: "COMPLETED" });
        if (images.length) {
          console.debug("[TryOn] Completed", { image_urls: imageUrls });
          return { success: true, data: { images } };
        }
        onProgress?.({ status: "FAILED", logs: [{ message: "No images in result." }] });
        console.debug("[TryOn] Completed but no image_urls");
        return { success: false, error: "No images in result." };
      }

      if (status === "failed") {
        const message = jobError ?? "Try-on failed.";
        console.debug("[TryOn] Job failed", { error: message, data: payload });
        onProgress?.({ status: "FAILED", logs: [{ message }] });
        return { success: false, error: message };
      }

      onProgress?.({
        status: "IN_PROGRESS",
        logs: [{ message: "Processing..." }],
      });
    }

    console.debug("[TryOn] Timeout after", POLL_MAX_ATTEMPTS, "polls");
    onProgress?.({
      status: "FAILED",
      logs: [{ message: "Timeout waiting for try-on result." }],
    });
    return { success: false, error: "Timeout waiting for try-on result." };
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number; body?: ApiErrorBody & { message?: string } };
    const errorObj = err?.body?.error;
    const message: string =
      (typeof errorObj === "object" && typeof errorObj?.message === "string" ? errorObj.message : null) ??
      (typeof err?.body?.message === "string" ? err.body.message : null) ??
      (typeof err?.message === "string" ? err.message : null) ??
      "Try-on failed.";
    console.error("[TryOn] Error:", message, { status: err?.status, body: err?.body });
    onProgress?.({ status: "FAILED", logs: [{ message }] });
    return { success: false, error: message };
  }
}

/**
 * Async try-on (same as tryOnGenerate). Use tryOnGenerate with onProgress for UI.
 */
export async function tryOnGenerateSync(
  input: TryOnGenerateInput,
): Promise<TryOnGenerateResponse> {
  return tryOnGenerate(input);
}
