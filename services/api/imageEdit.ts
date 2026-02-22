/**
 * Image Edit API — FireRed (fal.ai) instruction-based image editing.
 * Submit: POST /api/v1/ai/image-edit → 202 with request_id.
 * Poll: GET /api/v1/ai/jobs/{request_id}?type=image_edit until completed or failed.
 * Auth: Sanctum (Authorization: Bearer <token>).
 */

import { request, ApiError } from "./client";

const IMAGE_EDIT_PATH = "/api/v1/ai/image-edit";
const AI_JOBS_PATH = "/api/v1/ai/jobs";
const IMAGE_EDIT_JOB_TYPE = "image_edit";

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 60; // ~5 minutes at 5s interval

/** Progress update for UI during image edit. */
export type ImageEditQueueUpdate = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: { message: string }[];
};

export interface ImageEditGenerateInput {
  /** Editing instruction (English or Chinese). */
  prompt: string;
  /** One or more image URLs or base64 data URIs to edit. */
  image_urls: string[];
  /** Output size. Default 576×768 portrait. */
  image_size?: { width: number; height: number };
  num_inference_steps?: number;
  guidance_scale?: number;
  output_format?: "png" | "jpeg";
  num_images?: number;
  seed?: number;
  negative_prompt?: string;
  acceleration?: "none" | "regular" | "high";
  enable_safety_checker?: boolean;
}

export interface ImageEditImageResult {
  url: string;
}

export interface ImageEditGenerateResponse {
  success: boolean;
  data?: { images: ImageEditImageResult[] };
  error?: string;
}

/** 202 response from POST image-edit. */
interface ImageEditSubmitResponse {
  success: boolean;
  data: { request_id: string };
}

/** 200 response from GET jobs?type=image_edit. */
interface ImageEditJobStatusResponse {
  success: boolean;
  data: {
    status: "processing" | "completed" | "failed";
    image_urls?: string[];
    error?: string;
  };
}

interface ApiErrorBody {
  success?: false;
  error?: { code?: string; message?: string };
}

function buildImageEditBody(input: ImageEditGenerateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: input.prompt,
    image_urls: input.image_urls,
  };
  if (input.image_size != null) body.image_size = input.image_size;
  if (input.num_inference_steps != null) body.num_inference_steps = input.num_inference_steps;
  if (input.guidance_scale != null) body.guidance_scale = input.guidance_scale;
  if (input.output_format != null) body.output_format = input.output_format;
  if (input.num_images != null) body.num_images = input.num_images;
  if (input.seed != null) body.seed = input.seed;
  if (input.negative_prompt != null) body.negative_prompt = input.negative_prompt;
  if (input.acceleration != null) body.acceleration = input.acceleration;
  if (input.enable_safety_checker != null) body.enable_safety_checker = input.enable_safety_checker;
  return body;
}

/**
 * Generate edited image(s) via async job: submit then poll until completed or failed.
 */
export async function imageEditGenerate(
  input: ImageEditGenerateInput,
  onProgress?: (update: ImageEditQueueUpdate) => void,
): Promise<ImageEditGenerateResponse> {
  onProgress?.({
    status: "IN_PROGRESS",
    logs: [{ message: "Creating image edit..." }],
  });

  try {
    const body = buildImageEditBody(input);
    console.debug("[ImageEdit] Submitting POST", IMAGE_EDIT_PATH, {
      prompt: input.prompt,
      image_urls_count: input.image_urls?.length ?? 0,
    });
    const submitRes = await request<ImageEditSubmitResponse>(
      "POST",
      IMAGE_EDIT_PATH,
      { body, requiresAuth: true },
    );
    const requestId = submitRes?.data?.request_id;
    console.debug("[ImageEdit] Submit response", { request_id: requestId });

    if (!requestId) {
      onProgress?.({ status: "FAILED", logs: [{ message: "Image edit could not be started." }] });
      return { success: false, error: "Image edit could not be started." };
    }

    onProgress?.({
      status: "IN_QUEUE",
      logs: [{ message: "Waiting in queue..." }],
    });
    console.debug("[ImageEdit] Polling request_id:", requestId);

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let statusRes: ImageEditJobStatusResponse;
      try {
        statusRes = await request<ImageEditJobStatusResponse>(
          "GET",
          `${AI_JOBS_PATH}/${encodeURIComponent(requestId)}?type=${IMAGE_EDIT_JOB_TYPE}`,
          { requiresAuth: true },
        );
      } catch (pollErr) {
        const err = pollErr as { status?: number; body?: unknown };
        console.debug("[ImageEdit] Poll error", {
          attempt: attempt + 1,
          status: pollErr instanceof ApiError ? pollErr.status : err?.status,
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

      if (status === "completed") {
        const images = imageUrls.map((url) => ({ url }));
        onProgress?.({ status: "COMPLETED" });
        if (images.length) {
          console.debug("[ImageEdit] Completed", { image_urls: imageUrls });
          return { success: true, data: { images } };
        }
        onProgress?.({ status: "FAILED", logs: [{ message: "No images in result." }] });
        return { success: false, error: "No images in result." };
      }

      if (status === "failed") {
        const message = jobError ?? "Image edit failed.";
        onProgress?.({ status: "FAILED", logs: [{ message }] });
        return { success: false, error: message };
      }

      onProgress?.({
        status: "IN_PROGRESS",
        logs: [{ message: "Processing..." }],
      });
    }

    onProgress?.({ status: "FAILED", logs: [{ message: "Timeout waiting for result." }] });
    return { success: false, error: "Timeout waiting for result." };
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number; body?: ApiErrorBody & { message?: string } };
    const errorObj = err?.body?.error;
    const message: string =
      (typeof errorObj === "object" && typeof errorObj?.message === "string" ? errorObj.message : null) ??
      (typeof err?.body?.message === "string" ? err.body.message : null) ??
      (typeof err?.message === "string" ? err.message : null) ??
      "Image edit failed.";
    console.error("[ImageEdit] Error:", message, { status: err?.status });
    onProgress?.({ status: "FAILED", logs: [{ message }] });
    return { success: false, error: message };
  }
}
