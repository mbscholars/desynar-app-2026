/**
 * API types from mobile-app/API-AND-DATA.md
 */

export interface MediaItem {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  element: 'image' | 'video' | 'audio' | 'file';
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
    type: 'admin' | 'tailor' | 'dealer';
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

export interface MeasurementProfileListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  isComplete?: boolean;
  created_at: string;
  updated_at: string;
  user_measurements: unknown[];
}

export interface MeasurementProfilesResponse {
  success?: boolean;
  data: MeasurementProfileListItem[];
  message?: string;
}

export interface OrderMeta {
  outfit_name: string;
  outfit_source: 'upload' | 'catalog' | 'ai';
  outfit_preview: string;
}

export interface Order {
  id: number;
  reference: string;
  status: string;
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
  total: unknown;
  notes: string | null;
  currency_code: string;
  placed_at: string | null;
  meta: OrderMeta;
  created_at: string;
  updated_at: string;
  organization?: { id: number; business_name: string };
  user?: { id: number; first_name: string; last_name: string; email: string };
  invoices?: unknown[];
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
