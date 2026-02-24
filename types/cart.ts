/**
 * Cart types for persistent device cart (no backend).
 * Product snapshot is stored so cart is independent of feed updates.
 * Customizations align with web OrderingFlow (step 2 / try-on).
 */

/** Single AI revision (preview URL, prompt, optional uploaded/accepted URL). */
export type CartRevision = {
  preview: string;
  prompt: string;
  uploadedUrl?: string;
  isAccepted?: boolean;
};

/** Outfit source for create-batch: upload (image), store (catalog), ai (recommendation). */
export type OutfitSource = "upload" | "store" | "ai";

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
  /** Tailor/organization id for create-order API. Set when adding from feed. */
  organizationId?: number;
  /** When "upload", backend expects product_id from outfit-upload and outfit_preview. */
  outfit_source?: OutfitSource;
};

/** Per-line customizations: instructions, voice, AI revisions, accepted image (AI or try-on). */
export type CartItemCustomization = {
  textInstructions?: string;
  voiceNoteUrl?: string;
  voiceTranscript?: string;
  aiRevisions?: CartRevision[];
  /** Accepted customized or try-on image URL; used to replace cart display image. */
  acceptedCustomizedImageUrl?: string;
};

/** Snapshot of a measurement profile stored on a cart line (id, name, image URLs for try-on/display). */
export type CartProfile = {
  id: string;
  name: string;
  frontImageUri: string | null;
  sideImageUri: string | null;
};

export type CartItem = {
  /** Unique line id (for key and remove/update). */
  lineId: string;
  product: CartProduct;
  quantity: number;
  /** Full profile snapshots for this line (replaces selectedProfileIds/selectedProfileNames). */
  selectedProfiles: CartProfile[];
  /** Optional customizations (instructions, AI, try-on). */
  customization?: CartItemCustomization;
};

export const CART_STORAGE_KEY = "@desynar_cart";
