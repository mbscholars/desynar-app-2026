/**
 * Cart types for persistent device cart (no backend).
 * Product snapshot is stored so cart is independent of feed updates.
 */

export type CartProduct = {
  id: number;
  imageUri: string;
  mediaUrls: string[];
  creatorName: string;
  creatorAvatar?: string;
  outfitName: string;
  description?: string;
  tags?: string[];
  price?: number;
  currency?: string;
  category?: string;
};

export type CartItem = {
  /** Unique line id (for key and remove/update). */
  lineId: string;
  product: CartProduct;
  quantity: number;
  selectedProfileIds: string[];
  /** Profile names for display (e.g. "John", "Jane"). */
  selectedProfileNames?: string[];
};

export const CART_STORAGE_KEY = "@desynar_cart";
