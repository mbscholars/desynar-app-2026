import type { WearResponse } from "@/services/api";

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
};

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
