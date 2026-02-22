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
   * Upload voice note for order customization.
   * POST /api/v1/orders/voice-note with multipart audio file.
   * Backend accepts: webm, mp3, mp4, wav, ogg. expo-av records to m4a → send as mp4.
   * Returns URL, transcript, and duration.
   */
  uploadVoiceNote: async (
    audioUri: string,
  ): Promise<VoiceNoteUploadResponse> => {
    const formData = new FormData();
    const ext = audioUri.split(".").pop()?.toLowerCase() ?? "mp4";
    const allowed = ["webm", "mp3", "mp4", "wav", "ogg"];
    const name = allowed.includes(ext) ? `voice.${ext}` : "voice.mp4";
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
      uri: audioUri,
      name,
      type,
    } as unknown as Blob);
    return request<VoiceNoteUploadResponse>("POST", `${BASE}/voice-note`, {
      formData,
      requiresAuth: true,
    });
  },
};
