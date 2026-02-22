import { FeedCard } from "@/components/FeedCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  atelier,
} from "@/constants/theme";
import { useCart } from "@/context/CartContext";
import { ApiError, clothesApi } from "@/services/api";
import type { CartProfile } from "@/types/cart";
import type { FeedItem } from "@/types/feed";
import { wearToFeedItem } from "@/types/feed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_TAP = 44;
const GRID_GAP = spacing[2];
const GRID_PADDING = spacing[4];
const numColumns = 2;
const cardWidth =
  (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) /
  numColumns;

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = (q ?? "").trim();
  const { addItem } = useCart();

  const [list, setList] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "feed">("grid");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clothesApi.getList(query ? { q: query } : undefined);
      const items = (res.data || []).map(wearToFeedItem);
      setList(items);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load results.";
      setError(message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const openProductDrawer = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setDrawerVisible(true);
  }, []);

  const closeProductDrawer = useCallback(() => {
    setDrawerVisible(false);
    setSelectedItem(null);
  }, []);

  const handleAddToCart = useCallback(
    (item: FeedItem, selectedProfiles: CartProfile[]) => {
      addItem(item, selectedProfiles, 1);
    },
    [addItem],
  );

  const handleMakeItNow = useCallback(
    (item: FeedItem, selectedProfiles: CartProfile[]) => {
      addItem(item, selectedProfiles, 1);
      router.push("/review");
    },
    [addItem, router],
  );

  const handleShare = useCallback(async (item: FeedItem) => {
    const { Share } = await import("react-native");
    try {
      await Share.share({
        title: item.outfitName,
        message: `Check out ${item.outfitName} by ${item.creatorName}`,
      });
    } catch {
      // User cancelled
    }
  }, []);

  const handleGridItemPress = useCallback((index: number) => {
    setSelectedIndex(index);
    setViewMode("feed");
  }, []);

  const handleBackToGrid = useCallback(() => {
    setViewMode("grid");
  }, []);

  const feedHeight = listHeight;
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: feedHeight,
      offset: feedHeight * index,
      index,
    }),
    [feedHeight],
  );

  const renderGridItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <Pressable
        style={({ pressed }) => [
          styles.gridCard,
          { width: cardWidth, opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={() => handleGridItemPress(index)}
      >
        <Image
          source={{ uri: item.imageUri || undefined }}
          style={styles.gridImage}
          resizeMode="cover"
        />
        <View style={styles.gridCaption}>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {item.outfitName}
          </Text>
          <Text style={styles.gridCreator} numberOfLines={1}>
            {item.creatorName}
          </Text>
        </View>
      </Pressable>
    ),
    [handleGridItemPress],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={[styles.slide, { height: feedHeight }]}>
        <FeedCard
          item={item}
          onPressMedia={() => openProductDrawer(item)}
          onLike={() => {}}
        />
      </View>
    ),
    [feedHeight, openProductDrawer],
  );

  const onFeedLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const { height } = e.nativeEvent.layout;
      if (height > 0) setListHeight(height);
    },
    [],
  );

  if (loading && list.length === 0) {
    return (
      <View style={styles.screenWrap}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={atelier.accent} />
          <Text style={styles.loadingText}>Loading results…</Text>
        </View>
      </View>
    );
  }

  if (error && list.length === 0) {
    return (
      <View style={styles.screenWrap}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => fetchResults()}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtnTop, pressed && { opacity: 0.8 }]}
          >
            <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={styles.screenWrap}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <Text style={styles.emptyText}>No results for &quot;{query}&quot;</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtnTop, pressed && { opacity: 0.8 }]}
          >
            <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (viewMode === "feed") {
    return (
      <View style={styles.screenWrap}>
        <View style={styles.feedContainer}>
          <View
            style={[styles.feedHeader, { paddingTop: insets.top }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={handleBackToGrid}
              style={({ pressed }) => [
                styles.feedBackBtn,
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={12}
            >
              <FontAwesome name="chevron-left" size={22} color="#FFFFFF" />
              <Text style={styles.feedBackBtnText}>Results</Text>
            </Pressable>
          </View>
          <View style={styles.listWrap} onLayout={onFeedLayout}>
            <FlatList
              ref={listRef}
              data={list}
              renderItem={renderFeedItem}
              keyExtractor={(item) => String(item.id)}
              pagingEnabled
              snapToAlignment="start"
              snapToInterval={feedHeight}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              getItemLayout={getItemLayout}
              initialScrollIndex={selectedIndex}
              initialNumToRender={2}
              maxToRenderPerBatch={2}
              windowSize={3}
            />
          </View>
        </View>
        <ProductDetailDrawer
          item={selectedItem}
          visible={drawerVisible}
          onClose={closeProductDrawer}
          onAddToCart={handleAddToCart}
          onMakeItNow={handleMakeItNow}
          onShare={handleShare}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingBottom: spacing[3] }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerBack, pressed && { opacity: 0.8 }]}
            hitSlop={12}
          >
            <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Results for &quot;{query || "…"}&quot;
          </Text>
          <View style={styles.headerBack} />
        </View>
        <FlatList
          data={list}
          renderItem={renderGridItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          key="grid"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: atelier.background,
    padding: spacing[6],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: atelier.divider,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
  },
  gridContent: {
    padding: GRID_PADDING,
    paddingBottom: spacing[8],
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: atelier.panel,
    ...shadows.soft,
  },
  gridImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: atelier.panelBorder,
  },
  gridCaption: {
    padding: spacing[2],
  },
  gridTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
  },
  gridCreator: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    marginTop: 2,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  feedHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  feedBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingRight: spacing[4],
  },
  feedBackBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: "#FFFFFF",
  },
  listWrap: { flex: 1 },
  slide: { width: SCREEN_WIDTH },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    textAlign: "center",
    fontFamily: typography.fontFamily.sans,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  retryBtn: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.lg,
    backgroundColor: atelier.accent,
  },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.semibold,
  },
  backBtnTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[4],
  },
  backBtnText: {
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
});
