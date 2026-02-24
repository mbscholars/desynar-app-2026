import type { OutfitUploadResponse, WearResponse } from "@/services/api";

export type OutfitSource = "upload" | "store" | "ai";

export type FeedItem = {
  id: number;
  imageUri: string;
  mediaUrls: string[];
  creatorName: string;
  creatorAvatar?: string;
  outfitName: string;
  description?: string;
  tags?: string[];
  likes: number;
  isLiked: boolean;
  price?: number;
  currency?: string;
  category?: string;
  /** Tailor/organization id for checkout. From API when available. */
  organizationId?: number;
  /** When set to "upload", cart/checkout use outfit_source: "upload" and product_id from upload. */
  outfitSource?: OutfitSource;
};

/**
 * Convert outfit-upload API response to a FeedItem so it can be shown in the feed and added to cart.
 */
export function outfitUploadResponseToFeedItem(res: OutfitUploadResponse): FeedItem {
  const d = res.data;
  const mediaUrls = (d.media ?? [])
    .map((m) => m.full_url || m.original_url || m.preview_url)
    .filter(Boolean);
  const imageUri = mediaUrls[0] ?? "";
  return {
    id: d.product_id,
    imageUri,
    mediaUrls,
    creatorName: "Your upload",
    outfitName: d.name || "Custom outfit",
    description: d.description ?? undefined,
    likes: 0,
    isLiked: false,
    organizationId: undefined,
    outfitSource: "upload",
  };
}

export function wearToFeedItem(w: WearResponse): FeedItem {
  const mediaUrls =
    w.media
      ?.map((m) => m.full_url || m.preview_url || m.original_url)
      .filter(Boolean) ?? [];
  const imageUri = mediaUrls[0] ?? "";
  const wearWithOrg = w as WearResponse & { organization_id?: number };
  return {
    id: w.id,
    imageUri,
    mediaUrls,
    creatorName: w.creator?.name ?? "Unknown",
    creatorAvatar: w.creator?.avatar,
    outfitName: w.name,
    description: w.description,
    tags: w.tags,
    likes: w.likes_count ?? 0,
    isLiked: w.is_liked ?? false,
    price: w.base_price?.amount,
    currency: w.base_price?.currency_code ?? "USD",
    category: w.category?.name,
    organizationId:
      wearWithOrg.organization_id ??
      (w.creator as { id?: number } | undefined)?.id,
  };
}
