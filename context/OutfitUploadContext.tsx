import React, { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { ApiError, ordersApi } from "@/services/api";
import type { FeedItem } from "@/types/feed";
import { outfitUploadResponseToFeedItem } from "@/types/feed";
import * as ImagePicker from "expo-image-picker";

type OutfitUploadContextValue = {
  uploadedItem: FeedItem | null;
  setUploadedItem: (item: FeedItem | null) => void;
  uploadingOutfit: boolean;
  /** Run picker + upload; sets uploadedItem on success. Call from "Upload design" in add popover. */
  startUpload: () => Promise<void>;
  /** When set, home screen should fetch this product and open its detail drawer (e.g. after "Add to catalog" → View catalog). */
  pendingViewProductId: number | null;
  setPendingViewProductId: (id: number | null) => void;
};

const OutfitUploadContext = React.createContext<OutfitUploadContextValue | null>(
  null,
);

export function useOutfitUpload(): OutfitUploadContextValue {
  const ctx = React.useContext(OutfitUploadContext);
  if (ctx == null) throw new Error("useOutfitUpload must be used within OutfitUploadProvider");
  return ctx;
}

export function OutfitUploadProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [uploadedItem, setUploadedItem] = useState<FeedItem | null>(null);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const [pendingViewProductId, setPendingViewProductId] = useState<number | null>(null);

  const startUpload = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign in",
        "Please sign in to upload an outfit design.",
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo library",
        "Photo library access is required to upload an outfit.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setUploadingOutfit(true);
    try {
      const name = uri.split("/").pop()?.replace(/\.[^.]+$/, "") || "My outfit";
      const res = await ordersApi.uploadOutfit(uri, name);
      const feedItem = outfitUploadResponseToFeedItem(res);
      setUploadedItem(feedItem);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Upload failed.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploadingOutfit(false);
    }
  }, [isAuthenticated]);

  const value: OutfitUploadContextValue = {
    uploadedItem,
    setUploadedItem,
    uploadingOutfit,
    startUpload,
    pendingViewProductId,
    setPendingViewProductId,
  };

  return (
    <OutfitUploadContext.Provider value={value}>
      {children}
    </OutfitUploadContext.Provider>
  );
}
