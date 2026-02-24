/**
 * Outfit Builder API — Generate Outfit (AI pipeline).
 * Draft is managed on the device only; backend receives the payload and returns image(s).
 *
 * Backend (Laravel):
 * - POST /api/v1/ai/outfit-generate — Auth: Bearer (sanctum). Body: gender, body_model_id?, sections.
 *   Returns 202: { success: true, data: { job_id, preview_image_url? } }. On error: 400 { success: false, error }.
 * - GET /api/v1/ai/jobs/:job_id?type=outfit_generate — Auth: Bearer. Returns job status; completed → data.image_urls.
 */

import type { LookRecipe } from "@/types/outfitRecipe";
import { GARMENT_COLORS } from "@/constants/outfitBuilder";
import { request, ApiError } from "./client";
import type { WearResponse } from "./types";

const DRAFT_PATH = "/api/v1/outfit-builder/draft";
const GENERATE_PATH = "/api/v1/ai/outfit-generate";
const JOBS_PATH = "/api/v1/ai/jobs";
const CREATE_PRODUCT_FROM_OUTFIT_PATH = "/api/v1/ai/create-product-from-outfit";

export interface OutfitDraftSaveResponse {
  success: boolean;
  data?: { id?: string; updated_at?: string };
  error?: string;
}

export interface OutfitGenerateSubmitResponse {
  success: boolean;
  data?: {
    job_id: string;
    preview_image_url?: string;
  };
  error?: string;
}

export interface OutfitGenerateJobResponse {
  success: boolean;
  data?: {
    status: "processing" | "completed" | "failed";
    preview_image_url?: string;
    image_urls?: string[];
    error?: string;
  };
}

/** Normalized payload for backend: colors as hex in presets.color_hex, consistent section shape. */
export interface OutfitGeneratePayload {
  gender: "male" | "female";
  /** Optional user measurement/body model ID for try-on. */
  body_model_id?: string;
  sections: {
    model: {
      presets: { type?: string; complexion?: string };
      prompt: string;
      measurementProfileId?: string | null;
      imageRef?: string | null;
    };
    head: {
      presets: Record<string, string>;
      prompt: string;
      imageRef: string | null;
    };
    top: {
      presets: Record<string, string> & { color_hex?: string };
      prompt: string;
      imageRef: string | null;
      imageMode?: "style_only" | "full";
    };
    bottom: {
      presets: Record<string, string> & { color_hex?: string };
      prompt: string;
      imageRef: string | null;
    };
    shoes: {
      presets: Record<string, string> & { color_hex?: string };
      prompt: string;
    };
    background: {
      presets: Record<string, string>;
      prompt: string;
      blur: number;
      neutralBackground: boolean;
    };
  };
}

function colorToHex(color: string | undefined): string | undefined {
  if (!color || !color.trim()) return undefined;
  const s = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  const found = GARMENT_COLORS.find((c) => c.name.toLowerCase() === s.toLowerCase());
  return found ? found.hex : undefined;
}

/** Build a backend-ready payload from a look recipe (colors as hex, snake_case where expected). */
export function buildOutfitGeneratePayload(recipe: LookRecipe): OutfitGeneratePayload {
  const { gender, sections } = recipe;
  return {
    gender,
    body_model_id: recipe.sections.model.measurementProfileId ?? undefined,
    sections: {
      model: {
        presets: { ...sections.model.presets },
        prompt: sections.model.prompt ?? "",
        measurementProfileId: sections.model.measurementProfileId ?? null,
        imageRef: sections.model.imageRef ?? null,
      },
      head: {
        presets: { ...sections.head.presets } as Record<string, string>,
        prompt: sections.head.prompt ?? "",
        imageRef: sections.head.imageRef ?? null,
      },
      top: {
        presets: {
          ...sections.top.presets,
          color_hex: colorToHex(sections.top.presets.color),
        } as Record<string, string> & { color_hex?: string },
        prompt: sections.top.prompt ?? "",
        imageRef: sections.top.imageRef ?? null,
        imageMode: sections.top.imageMode ?? "style_only",
      },
      bottom: {
        presets: {
          ...sections.bottom.presets,
          color_hex: colorToHex(sections.bottom.presets.color),
        } as Record<string, string> & { color_hex?: string },
        prompt: sections.bottom.prompt ?? "",
        imageRef: sections.bottom.imageRef ?? null,
      },
      shoes: {
        presets: {
          ...sections.shoes.presets,
          color_hex: colorToHex(sections.shoes.presets.color),
        } as Record<string, string> & { color_hex?: string },
        prompt: sections.shoes.prompt ?? "",
      },
      background: {
        presets: { ...sections.background.presets } as Record<string, string>,
        prompt: sections.background.prompt ?? "",
        blur: sections.background.blur ?? 40,
        neutralBackground: sections.background.neutralBackground ?? true,
      },
    },
  };
}

/**
 * Save draft to backend (optional). Caller should also persist to local storage.
 */
export async function saveOutfitDraft(
  recipe: LookRecipe,
  draftId?: string | null,
): Promise<OutfitDraftSaveResponse> {
  try {
    const method = draftId ? "PUT" : "POST";
    const path = draftId ? `${DRAFT_PATH}/${encodeURIComponent(draftId)}` : DRAFT_PATH;
    const res = await request<OutfitDraftSaveResponse>(method, path, {
      body: { recipe },
      requiresAuth: true,
    });
    return res ?? { success: false };
  } catch (e) {
    const err = e as ApiError & { message?: string };
    return {
      success: false,
      error: err?.message ?? "Failed to save draft.",
    };
  }
}

/**
 * Submit outfit generation job. Uses POST /api/v1/ai/outfit-generate with Bearer auth.
 * Backend returns 202 with job_id; on validation/error returns 400 with success: false and error (string).
 */
export async function submitOutfitGenerate(
  payload: OutfitGeneratePayload,
): Promise<{ success: boolean; jobId?: string; previewImageUrl?: string; error?: string }> {
  try {
    const res = await request<OutfitGenerateSubmitResponse>("POST", GENERATE_PATH, {
      body: JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
      requiresAuth: true,
    });
    const data = res?.data;
    if (res?.success && data?.job_id) {
      return {
        success: true,
        jobId: data.job_id,
        previewImageUrl: data.preview_image_url ?? undefined,
      };
    }
    return {
      success: false,
      error: (res as { error?: string })?.error ?? "Failed to start generation.",
    };
  } catch (e) {
    const err = e as ApiError & { body?: { error?: string }; message?: string };
    const message =
      (err?.status === 400 && err?.body && "error" in err.body && err.body.error) ||
      err?.message;
    return {
      success: false,
      error: message ?? "Failed to generate outfit.",
    };
  }
}

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 75; // ~5 min

/**
 * Poll outfit generation job until completed or failed.
 * Uses GET /api/v1/ai/jobs/:job_id?type=outfit_generate with Bearer auth.
 * Backend returns 404 if job not found or user mismatch (outfit_image_job_user:{job_id} !== auth user).
 */
export async function pollOutfitJob(
  jobId: string,
  onStatus?: (status: string, previewUrl?: string) => void,
): Promise<{
  success: boolean;
  imageUrls?: string[];
  previewImageUrl?: string;
  error?: string;
}> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const res = await request<OutfitGenerateJobResponse>(
        "GET",
        `${JOBS_PATH}/${encodeURIComponent(jobId)}?type=outfit_generate`,
        { requiresAuth: true },
      );
      const data = res?.data;
      const status = data?.status ?? "processing";
      onStatus?.(status, data?.preview_image_url);

      if (status === "completed") {
        return {
          success: true,
          imageUrls: data?.image_urls ?? [],
          previewImageUrl: data?.preview_image_url,
        };
      }
      if (status === "failed") {
        return {
          success: false,
          error: data?.error ?? "Generation failed.",
        };
      }
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 404) {
        return { success: false, error: "Job not found or access denied." };
      }
      // transient; keep polling
    }
  }
  return { success: false, error: "Timeout waiting for result." };
}

export interface CreateProductFromOutfitResponse {
  success: boolean;
  message?: string;
  /** Full cloth (same shape as clothes API) so UI can show feed card without a second request. */
  data?: WearResponse & { product_id?: number };
  error?: string;
}

/**
 * Create a product from a completed outfit_generate job.
 * POST /api/v1/ai/create-product-from-outfit with Bearer auth.
 * Body: { job_id: string }. Job must exist, belong to user, and be completed.
 * Returns 201: { success: true, data: cloth } with full cloth (id, name, description, status, base_price, type, lead_time_days, creator, media, created_at, updated_at).
 * Errors: 404 JOB_NOT_FOUND, 400 JOB_NOT_COMPLETED | NO_IMAGES | PRODUCT_CREATION_FAILED.
 */
export async function createProductFromOutfitGenerate(
  jobId: string,
): Promise<{
  success: boolean;
  productId?: number;
  productName?: string;
  /** Full cloth when success; use with wearToFeedItem to show in feed / drawer. */
  cloth?: WearResponse;
  error?: string;
}> {
  try {
    const res = await request<CreateProductFromOutfitResponse>(
      "POST",
      CREATE_PRODUCT_FROM_OUTFIT_PATH,
      {
        body: { job_id: jobId },
        requiresAuth: true,
      },
    );
    const data = res?.data;
    if (res?.success && data != null && (data.id != null || (data as { product_id?: number }).product_id != null)) {
      const cloth = data as WearResponse;
      return {
        success: true,
        productId: cloth.id ?? (data as { product_id?: number }).product_id,
        productName: data.name,
        cloth,
      };
    }
    return {
      success: false,
      error: (res as CreateProductFromOutfitResponse)?.error ?? "Could not create product.",
    };
  } catch (e) {
    const err = e as ApiError & { body?: { error?: string }; message?: string };
    const message =
      (err?.status === 400 && err?.body && "error" in err.body && err.body.error) ||
      (err?.status === 404 && err?.body && "error" in err.body && err.body.error) ||
      err?.message;
    return {
      success: false,
      error: message ?? "Could not create product.",
    };
  }
}
