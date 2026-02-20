/**
 * API types from mobile-app/API-AND-DATA.md
 */

export interface MediaItem {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  element: "image" | "video" | "audio" | "file";
  size: number;
  original_url: string;
  preview_url: string;
  order_column: number;
  full_url: string;
}

export interface WearResponse {
  id: number;
  name: string;
  description: string;
  status: string;
  base_price?: {
    amount: number;
    currency_code: string;
    currency_name: string;
    decimal_places: number;
    formatted: string;
  };
  type?: string;
  category_id?: number;
  category?: { id: number; name: string };
  lead_time_days?: number;
  customizations?: Record<string, string[]>;
  media?: MediaItem[];
  creator?: {
    id: number;
    name: string;
    avatar?: string;
    type: "admin" | "tailor" | "dealer";
  };
  seo?: { slug: string; meta_title: string; meta_description: string };
  likes_count?: number;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
  meta?: { outfit_video_url?: string };
}

export interface ClothesListResponse {
  success: boolean;
  data: WearResponse[];
}

export interface ClothDetailResponse {
  success: boolean;
  message: string;
  data: WearResponse;
}

export interface LikeResponse {
  success: boolean;
  message: string;
  data: { likes_count: number; is_liked: boolean };
}

export interface WalkVideoResponse {
  data: { video_url: string };
}

/** Single measurement value in a profile (e.g. height, weight, front_view, gender). */
export interface UserMeasurementItem {
  id: number;
  user_id: number;
  measurement_id: number;
  name: string;
  value: string;
  unit: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeasurementProfileListItem {
  id: number;
  user_id?: number;
  name: string;
  slug: string;
  description: string | null;
  unit?: string | null;
  input_type?: string;
  is_active: boolean;
  position?: number;
  isComplete?: boolean;
  created_at: string;
  updated_at: string;
  user_measurements: UserMeasurementItem[];
}

export interface MeasurementProfilesResponse {
  success?: boolean;
  data: MeasurementProfileListItem[];
  message?: string;
}

export interface OrderMeta {
  outfit_name: string;
  outfit_source: "upload" | "catalog" | "ai" | "store";
  outfit_preview: string;
  /** Single-order response only */
  batch_payment_reference?: string;
  transaction_id?: number;
  holding_fee_paid?: boolean;
  holding_fee_transaction_id?: string;
}

/** Price/amount with currency (from API). */
export interface PriceValue {
  value: number;
  currency?: { code: string; name?: string };
  unitQty?: number;
}

export interface Order {
  id: number;
  reference: string;
  status: string;
  stage?: string;
  customer_id: number | null;
  organization_id: number;
  user_id: number;
  cart_id: number | null;
  channel_id: number;
  new_customer: boolean;
  sub_total: unknown;
  discount_total: unknown;
  shipping_total: unknown;
  tax_total: unknown;
  total?: PriceValue | unknown;
  notes: string | null;
  currency_code: string;
  placed_at: string | null;
  meta: OrderMeta;
  created_at: string;
  updated_at: string;
  organization?: { id: number; business_name: string; verified?: number };
  user?: { id: number; first_name: string; last_name: string; email: string };
  invoices?: unknown[];
}

/** Product inside order customization (single-order response). */
export interface OrderCustomizationProduct {
  id: number;
  attribute_data?: {
    name?: { en?: string };
    type?: string;
    source?: string;
    generation_config?: string;
  };
  meta?: string | { outfit_video_url?: string };
}

export interface OrderCustomization {
  id: number;
  order_id: number;
  product_id: number;
  text_instructions: string | null;
  voice_note_url: string | null;
  voice_note_transcript: string | null;
  try_on_completed: boolean;
  created_at: string;
  updated_at: string;
  product?: OrderCustomizationProduct;
}

export interface OrderProfileMeasurementSnapshot {
  original_profile_id: number;
  profile_name: string;
  profile_description?: string;
  profile_unit: string;
  snapshot_taken_at: string;
  measurements: unknown[];
}

export interface OrderProfile {
  id: number;
  order_id: number;
  order_customization_id: number | null;
  measurement_profile_id: number;
  measurement_snapshot?: OrderProfileMeasurementSnapshot;
  profile_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  measurement_profile?: {
    id: number;
    name: string;
    description?: string;
    unit: string;
    is_snapshot?: boolean;
    snapshot_taken_at?: string;
  };
}

export interface OrderTransaction {
  id: number;
  order_id: number;
  success: number;
  type: string;
  driver: string;
  amount: PriceValue;
  reference: string;
  status: string;
  notes: string | null;
  meta?: {
    type?: string;
    payment_url?: string;
    customer_email?: string;
    is_batch_payment?: boolean;
    order_ids?: number[];
    fee_per_order?: number;
    currency?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface OrderActivity {
  id: number;
  action: string;
  category: string;
  description: string;
  properties?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrderChat {
  id: number;
  private: boolean;
  direct_message: boolean;
  data?: { title?: string; description?: string; thumbnail?: string | null };
  order_id: number;
  created_at: string;
  updated_at: string;
}

/** Single order by reference — includes relations. */
export interface OrderDetail extends Order {
  stage?: string;
  customizations?: OrderCustomization[];
  profiles?: OrderProfile[];
  transactions?: OrderTransaction[];
  activities?: OrderActivity[];
  chats?: OrderChat[];
  organization?: { id: number; business_name: string; verified?: number };
}

export interface OrderSingleResponse {
  success: boolean;
  data: {
    order: OrderDetail;
    chat?: OrderChat;
  };
}

export interface OrdersListResponse {
  success: boolean;
  data: Order[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}
