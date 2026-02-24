import * as FileSystem from "expo-file-system";

import { api, request } from "./client";
import type { OrderSingleResponse, OrdersListResponse } from "./types";

const BASE = "/api/v1/orders";

// --- Create batch (checkout) types ---
export interface OrderItemProfile {
  measurement_profile_id: number;
  quantity: number;
}

export interface OrderItemCustomizations {
  voice_note_url?: string | null;
  voice_transcript?: string | null;
  text_instructions?: string | null;
  ai_revisions?: { preview: string; prompt: string; uploadedUrl?: string; isAccepted?: boolean }[];
  accepted_customized_image_url?: string | null;
}

export interface CreateBatchOrderItem {
  product_id?: number;
  organization_id: number;
  outfit_name: string;
  outfit_source: "upload" | "store" | "ai";
  outfit_preview: string;
  customizations: OrderItemCustomizations;
  profiles: OrderItemProfile[];
}

export interface CreateBatchOrderRequest {
  payment_method: string;
  items: CreateBatchOrderItem[];
  notes?: string;
  /**
   * Optional. Where to redirect after payment (Paystack callback_url).
   * Backend should pass this to Paystack when initializing the transaction.
   * Use 'desynar://payment-success' for in-app auto-verify (Paystack may append ?reference=xxx).
   * If Paystack requires https, backend can use an https URL that redirects to this scheme.
   */
  callback_url?: string;
}

export interface CreatedOrder {
  id: number | string;
  reference: string;
  status: string;
  organization_id?: number | string;
  notes?: string;
}

/** Matches API: payment_url is the Paystack checkout URL (e.g. https://checkout.paystack.com/...) */
export interface HoldingFeeDetails {
  amount: number;
  amount_naira: number;
  currency: string;
  payment_url: string;
  reference: string;
  transaction_id?: number;
  error?: string | null;
  order_count: number;
  fee_per_order: number;
  fee_per_order_naira: number;
}

export interface CreateBatchOrderResponse {
  success: boolean;
  message: string;
  data: {
    orders: CreatedOrder[];
    holding_fee: HoldingFeeDetails;
  };
}

export interface PaystackVerificationResponse {
  success: boolean;
  message: string;
  reference?: string;
  transaction_id?: string;
  amount?: number;
  amount_naira?: number;
  currency?: string;
  paid_at?: string;
  channel?: string;
  order_ids?: number[];
  order_references?: string[];
}

const MAX_VOICE_NOTE_DURATION_SEC = 180; // 3 minutes

// --- Outfit upload (Order Create: image upload) ---
export interface OutfitUploadMedia {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  size: number;
  original_url: string;
  preview_url: string;
  full_url: string;
  order_column: number;
}

export interface OutfitUploadResponse {
  success: boolean;
  message: string;
  data: {
    product_id: number;
    name: string;
    description: string;
    status: string;
    base_price: number | null;
    type: string;
    lead_time_days: number | null;
    media: OutfitUploadMedia[];
    created_at: string;
    updated_at: string;
  };
}

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
] as const;
const DEFAULT_MIME = "image/jpeg";

function mimeFromUri(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    webp: "image/webp",
  };
  return map[ext] ?? DEFAULT_MIME;
}

function fileNameFromUri(uri: string): string {
  const parts = uri.split("/");
  const last = parts[parts.length - 1] ?? "";
  return last && last.includes(".") ? last : "outfit.jpg";
}

export interface VoiceNoteUploadResponse {
  success: boolean;
  data: {
    url: string;
    transcript: string;
    duration: number;
  };
}

export interface GetOrdersParams {
  page?: number;
  per_page?: number;
  status?: string;
}

/** Max recording duration in seconds (3 minutes). */
export const VOICE_NOTE_MAX_DURATION_SEC = MAX_VOICE_NOTE_DURATION_SEC;

export const ordersApi = {
  /** List orders for current user. Requires auth. */
  getList: (params?: GetOrdersParams) => {
    const search = new URLSearchParams();
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.per_page != null)
      search.set("per_page", String(params.per_page));
    if (params?.status) search.set("status", params.status);
    const qs = search.toString();
    return api.get<OrdersListResponse>(qs ? `${BASE}?${qs}` : BASE);
  },

  /** Single order by reference. Requires auth. Returns order + optional chat. */
  getByReference: (reference: string) =>
    api.get<OrderSingleResponse>(`${BASE}/${encodeURIComponent(reference)}`),

  /** Cancel order. Requires auth. */
  cancel: (orderId: number, body?: { reason?: string }) =>
    api.post<{ success: boolean; message: string }>(
      `${BASE}/${orderId}/cancel`,
      body,
    ),

  /**
   * Create batch orders from cart and get holding-fee payment URL.
   * Requires auth. Returns orders + holding_fee (payment_url, reference).
   */
  createBatch: (data: CreateBatchOrderRequest) =>
    request<CreateBatchOrderResponse>("POST", BASE, {
      body: data,
      requiresAuth: true,
    }),

  /**
   * Verify Paystack payment after user completes payment in browser.
   * Call with reference (and optional transaction_id) from payment callback.
   */
  verifyPaystackPayment: (reference: string, transactionId?: string) =>
    request<PaystackVerificationResponse>("POST", "/api/v1/paystack/payment-verification", {
      body: { reference, transaction_id: transactionId },
      requiresAuth: true,
    }),

  /**
   * Upload outfit image to create a product for order. POST /api/v1/orders/outfit-upload.
   * Frontend should validate type (jpeg/png/heic/webp) and size (e.g. ≤10MB); compress to ~400KB if desired.
   * Returns product_id and media URLs for cart and create-batch (outfit_source: "upload").
   */
  uploadOutfit: async (
    fileUri: string,
    name?: string,
    description?: string,
  ): Promise<OutfitUploadResponse> => {
    const mime = mimeFromUri(fileUri);
    if (!ALLOWED_IMAGE_MIMES.includes(mime as (typeof ALLOWED_IMAGE_MIMES)[number])) {
      throw new Error("File must be an image (jpeg, png, heic, webp).");
    }
    const fileName = name?.trim() || fileNameFromUri(fileUri);
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName.includes(".") ? fileName : `${fileName}.jpg`,
      type: mime,
    } as unknown as Blob);
    if (name != null && name.trim() !== "") {
      formData.append("name", name.trim());
    }
    if (description != null && description.trim() !== "") {
      formData.append("description", description.trim());
    }
    return request<OutfitUploadResponse>("POST", `${BASE}/outfit-upload`, {
      formData,
      requiresAuth: true,
    });
  },

  /**
   * Upload voice note for order customization.
   * POST /api/v1/orders/voice-note with multipart audio file.
   * Backend accepts: webm, mp3, mp4, wav, ogg.
   * expo-av records to m4a (iOS/Android); we copy to a file named voice.mp4 so the
   * upload sends an accepted extension and avoid "file of type" validation errors.
   * Returns URL, transcript, and duration.
   */
  uploadVoiceNote: async (
    audioUri: string,
  ): Promise<VoiceNoteUploadResponse> => {
    const ext = audioUri.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["webm", "mp3", "mp4", "wav", "ogg"];
    const alreadyAccepted = allowed.includes(ext);

    let uriToUpload = audioUri;
    let tempPath: string | null = null;

    if (!alreadyAccepted) {
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) throw new Error("No cache directory for voice note");
      tempPath = `${dir}voice_${Date.now()}.mp4`;
      await FileSystem.copyAsync({
        from: audioUri,
        to: tempPath,
      });
      uriToUpload = tempPath;
    }

    try {
      const formData = new FormData();
      const name = alreadyAccepted ? `voice.${ext}` : "voice.mp4";
      const mime: Record<string, string> = {
        webm: "audio/webm",
        mp3: "audio/mpeg",
        mp4: "audio/mp4",
        m4a: "audio/mp4",
        wav: "audio/wav",
        ogg: "audio/ogg",
      };
      const type = mime[ext] ?? "audio/mp4";
      formData.append("audio", {
        uri: uriToUpload,
        name,
        type,
      } as unknown as Blob);
      return await request<VoiceNoteUploadResponse>("POST", `${BASE}/voice-note`, {
        formData,
        requiresAuth: true,
      });
    } finally {
      if (tempPath) {
        FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
      }
    }
  },
};
