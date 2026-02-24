import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useOutfitUpload } from "@/context/OutfitUploadContext";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { spacing, typography } from "@/constants/theme";
import type { FeedItem } from "@/types/feed";
import { wearToFeedItem } from "@/types/feed";
import { createProductFromOutfitGenerate } from "@/services/api/outfitBuilder";

function errorMessage(code: string): string {
  switch (code) {
    case "JOB_NOT_FOUND":
      return "Job not found or you don't have access to it.";
    case "JOB_NOT_COMPLETED":
      return "Outfit is still processing. Please wait and try again.";
    case "NO_IMAGES":
      return "No images available for this outfit.";
    case "PRODUCT_CREATION_FAILED":
      return "Could not create the product. Please try again.";
    default:
      return code || "Something went wrong.";
  }
}

export default function OutfitBuilderResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPendingViewItem } = useOutfitUpload();
  const params = useLocalSearchParams<{ imageUrls?: string; jobId?: string }>();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [addingToCatalog, setAddingToCatalog] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  const jobId = typeof params.jobId === "string" ? params.jobId : undefined;

  const imageUrls = useMemo(() => {
    try {
      const raw = params.imageUrls;
      if (typeof raw !== "string") return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [params.imageUrls]);

  const handleAddToCatalog = useCallback(async () => {
    if (!jobId) {
      Alert.alert(
        "Cannot add to catalog",
        "This outfit cannot be added to catalog. Generate a new outfit and try again.",
      );
      return;
    }
    setAddingToCatalog(true);
    try {
      const result = await createProductFromOutfitGenerate(jobId);
      // console.log("[Add to catalog] API response:", result);
      if (result.success) {
        const feedItem: FeedItem | null =
          result.cloth != null ? wearToFeedItem(result.cloth) : null;
        Alert.alert(
          "Added to catalog",
          `"${result.productName ?? "Generated Outfit"}" has been created as a draft. You can set the price and publish it from your catalog.`,
          [
            { text: "Done", onPress: () => router.replace("/outfit-builder") },
            {
              text: "View",
              onPress: () => {
                if (feedItem != null) setPendingViewItem(feedItem);
                router.replace("/(tabs)");
              },
            },
          ],
        );
      } else {
        Alert.alert("Could not add to catalog", errorMessage(result.error ?? ""));
      }
    } catch (e) {
      Alert.alert("Error", (e as Error)?.message ?? "Could not add to catalog.");
    } finally {
      setAddingToCatalog(false);
    }
  }, [jobId, router, setPendingViewItem]);

  const handleDone = useCallback(() => {
    router.replace("/outfit-builder");
  }, [router]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / winWidth);
      setCurrentIndex(Math.min(index, imageUrls.length - 1));
    },
    [winWidth, imageUrls.length],
  );

  const renderImageItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={[styles.slide, { width: winWidth, height: winHeight }]}>
        <Image
          source={{ uri: item }}
          style={styles.fullImage}
          resizeMode="cover"
        />
      </View>
    ),
    [winWidth, winHeight],
  );

  const keyExtractor = useCallback((item: string, index: number) => `${index}`, []);

  if (imageUrls.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerOverlay}>
          <Pressable onPress={handleDone} style={styles.backBtn} hitSlop={12}>
            <FontAwesome name="chevron-left" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No images to display.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={imageUrls}
        renderItem={renderImageItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: winWidth,
          offset: winWidth * index,
          index,
        })}
      />

      {/* Overlay: back button */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
        <Pressable onPress={handleDone} style={styles.backBtn} hitSlop={12}>
          <FontAwesome name="chevron-left" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Overlay: slider dots */}
      {imageUrls.length > 1 && (
        <View style={[styles.dotsContainer, { bottom: insets.bottom + 80 }]}>
          {imageUrls.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Overlay: Add to collection button */}
      <View
        style={[
          styles.buttonOverlay,
          {
            paddingBottom: insets.bottom + spacing[4],
            paddingHorizontal: spacing[6],
          },
        ]}
      >
        <Pressable
          onPress={handleAddToCatalog}
          disabled={addingToCatalog || !jobId}
          style={({ pressed }) => [
            styles.addToCollectionBtn,
            pressed && !addingToCatalog && styles.addToCollectionBtnPressed,
            (!jobId || addingToCatalog) && styles.addToCollectionBtnDisabled,
          ]}
        >
          {addingToCatalog ? (
            <ActivityIndicator size="small" color="#1C1C1E" />
          ) : (
            <FontAwesome name="plus" size={16} color="#1C1C1E" />
          )}
          <Text style={styles.addToCollectionBtnText}>
            {addingToCatalog ? "Adding…" : "Add to collection"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: outfitBuilderColors.background,
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  buttonOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  addToCollectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  addToCollectionBtnPressed: { opacity: 0.9 },
  addToCollectionBtnDisabled: { opacity: 0.6 },
  addToCollectionBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: "#1C1C1E",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing[12],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
});
