import { colors, spacing, typography } from "@/constants/theme";
import type { WearResponse } from "@/services/api";
import { ApiError, clothesApi } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_TAP = 44;

export type FeedItem = {
  id: number;
  imageUri: string;
  mediaUrls: string[];
  creatorName: string;
  creatorAvatar?: string;
  outfitName: string;
  likes: number;
  isLiked: boolean;
  price?: number;
  currency?: string;
  category?: string;
};

function wearToFeedItem(w: WearResponse): FeedItem {
  const mediaUrls =
    w.media
      ?.map((m) => m.full_url || m.preview_url || m.original_url)
      .filter(Boolean) ?? [];
  const imageUri = mediaUrls[0] ?? "";
  return {
    id: w.id,
    imageUri,
    mediaUrls,
    creatorName: w.creator?.name ?? "Unknown",
    creatorAvatar: w.creator?.avatar,
    outfitName: w.name,
    likes: w.likes_count ?? 0,
    isLiked: w.is_liked ?? false,
    price: w.base_price?.amount,
    currency: w.base_price?.currency_code ?? "USD",
    category: w.category?.name,
  };
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <FontAwesome name={icon} size={26} color="#FFFFFF" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const DOT_SIZE = 5;
const DOT_HIT = 20;
/** Dots sit above the bottom info (from bottom of card). */
const DOTS_BOTTOM_OFFSET = 140;

/** Inline walk video slide using expo-video (replaces deprecated expo-av). */
function WalkVideoSlide({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function FeedCard({
  item,
  onPressMedia,
  onLike,
}: {
  item: FeedItem;
  onPressMedia: () => void;
  onLike: () => void;
}) {
  const [liked, setLiked] = useState(item.isLiked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [walkVideoUrl, setWalkVideoUrl] = useState<string | null>(null);
  const [walkLoading, setWalkLoading] = useState(false);
  const mediaScrollRef = useRef<ScrollView>(null);
  const mediaUrls = item.mediaUrls?.length
    ? item.mediaUrls
    : item.imageUri
      ? [item.imageUri]
      : [];
  const effectiveUrls = walkVideoUrl ? [walkVideoUrl, ...mediaUrls] : mediaUrls;

  useEffect(() => {
    setLiked(item.isLiked);
    setLikeCount(item.likes);
  }, [item.id, item.isLiked, item.likes]);

  useEffect(() => {
    setCurrentMediaIndex(0);
    setWalkVideoUrl(null);
  }, [item.id]);

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    setIsLiking(true);
    try {
      const res = await clothesApi.like(item.id);
      setLiked(res.data.is_liked);
      setLikeCount(res.data.likes_count);
      onLike();
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  }, [item.id, liked, likeCount, isLiking, onLike]);

  const handleWalk = useCallback(async () => {
    if (walkLoading) return;
    setWalkLoading(true);
    try {
      const res = await clothesApi.getWalkVideo(item.id);
      const url = res?.data?.video_url ?? null;
      console.log("url", res.data);
      if (!url) {
        Alert.alert(
          "AI not available",
          "AI is not available for this product.",
        );
        return;
      }
      setWalkVideoUrl(url);
      setCurrentMediaIndex(0);
      mediaScrollRef.current?.scrollTo({ x: 0, animated: true });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 404) {
        Alert.alert(
          "AI not available",
          "AI is not available for this product.",
        );
      } else {
        Alert.alert(
          "Something went wrong",
          "Could not load walk video. Please try again.",
        );
      }
    } finally {
      setWalkLoading(false);
    }
  }, [item.id, walkLoading]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: item.outfitName,
        message: `Check out ${item.outfitName} by ${item.creatorName}`,
      });
    } catch {
      // User cancelled or share failed
    }
  }, [item.outfitName, item.creatorName]);

  const onMediaScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SCREEN_WIDTH);
      setCurrentMediaIndex(
        Math.min(Math.max(0, index), Math.max(0, effectiveUrls.length - 1)),
      );
    },
    [effectiveUrls.length],
  );

  const scrollToMedia = useCallback((index: number) => {
    setCurrentMediaIndex(index);
    mediaScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  }, []);

  const hasMultipleMedia = effectiveUrls.length > 1;

  const mediaContent =
    effectiveUrls.length === 0 ? (
      <View style={styles.mediaPlaceholder}>
        <FontAwesome name="image" size={48} color={colors.gray[500]} />
      </View>
    ) : hasMultipleMedia ? (
      <ScrollView
        ref={mediaScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMediaScroll}
        onScroll={onMediaScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        nestedScrollEnabled
        style={[styles.media, { width: SCREEN_WIDTH }]}
        contentContainerStyle={{ width: effectiveUrls.length * SCREEN_WIDTH }}
      >
        {effectiveUrls.map((uri, i) => (
          <View key={i} style={styles.mediaSlide}>
            {walkVideoUrl && i === 0 ? (
              <WalkVideoSlide uri={uri} />
            ) : (
              <ImageBackground
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
          </View>
        ))}
      </ScrollView>
    ) : (
      <ImageBackground
        source={{ uri: effectiveUrls[0] }}
        style={styles.media}
        resizeMode="cover"
      />
    );

  return (
    <View style={styles.card}>
      {/* Media area: no Pressable wrapper so horizontal ScrollView receives swipe gestures. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {mediaContent}
      </View>

      {/* Right-edge vignette so action buttons (Wear, 360°, Like, Share) stay visible on light media. */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.12)", "rgba(24, 24, 24, 0.4)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.vignetteRight}
        pointerEvents="none"
      />

      {hasMultipleMedia && (
        <View style={styles.dotsContainer} pointerEvents="box-none">
          <View style={styles.dotsRow}>
            {effectiveUrls.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => scrollToMedia(i)}
                style={styles.dotTouch}
                hitSlop={0}
              >
                <View
                  style={[
                    styles.dotOuter,
                    {
                      backgroundColor:
                        i === currentMediaIndex
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.4)",
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionsColumn} pointerEvents="box-none">
        <ActionButton icon="image" label="Wear" onPress={() => {}} />
        <Pressable
          onPress={handleWalk}
          disabled={walkLoading}
          style={({ pressed }) => [
            styles.actionBtn,
            (pressed || walkLoading) && { opacity: 0.6 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {walkLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome name="refresh" size={26} color="#FFFFFF" />
          )}
          <Text style={styles.actionLabel}>360°</Text>
        </Pressable>
        <Pressable
          onPress={handleLike}
          disabled={isLiking}
          style={({ pressed }) => [
            styles.actionBtn,
            (pressed || isLiking) && { opacity: 0.8 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome
            name={liked ? "heart" : "heart-o"}
            size={26}
            color={liked ? colors.danger[500] : "#FFFFFF"}
          />
          <Text style={styles.actionLabel}>{likeCount}</Text>
        </Pressable>
        <ActionButton icon="share-alt" label="Share" onPress={handleShare} />
      </View>

      {/* Compact backdrop behind text only (no full-width bar); text shadow keeps labels readable on any image. */}
      <View style={styles.bottomInfoBackdrop} pointerEvents="none" />
      <Pressable style={styles.bottomInfo} onPress={onPressMedia}>
        <View>
          <Text style={styles.creatorName} numberOfLines={1}>
            {item.creatorName}
          </Text>
          <Text style={styles.outfitName} numberOfLines={1}>
            {item.outfitName}
          </Text>
        </View>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={20} color={colors.primary[500]} />
        </View>
      </Pressable>
    </View>
  );
}

/** Tab bar height from (tabs)/_layout.tsx so each slide height matches viewport. */
const TAB_BAR_HEIGHT = 64;

function formatPrice(
  amount: number | undefined,
  currency: string = "USD",
): string {
  if (amount == null) return "—";
  return `${currency} ${(amount / 100).toLocaleString()}`;
}

function ProductDetailDrawer({
  item,
  visible,
  onClose,
  onMakeItNow,
  onShare,
}: {
  item: FeedItem | null;
  visible: boolean;
  onClose: () => void;
  onMakeItNow: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
}) {
  const router = useRouter();
  if (!item) return null;

  const handleMakeItNow = () => {
    onClose();
    onMakeItNow(item);
    router.push({
      pathname: "/(tabs)/orders",
      params: { product: String(item.id) },
    });
  };

  const handleShare = () => onShare(item);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.drawerBackdrop}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.drawerBackdropDim} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Pressable style={styles.drawerSheet} onPress={() => {}}>
          <View style={styles.drawerSheetBlurWrap}>
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.drawerSheetGlassOverlay} />
          </View>
          <View style={styles.drawerHandleWrap}>
            <View style={styles.drawerHandle} />
          </View>
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle} numberOfLines={2}>
                {item.outfitName}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.drawerCloseBtn}
                hitSlop={12}
              >
                <FontAwesome name="times" size={18} color={colors.gray[700]} />
              </Pressable>
            </View>
            <Text style={styles.drawerPrice}>
              {formatPrice(item.price, item.currency)}
            </Text>
            <Text style={styles.drawerPriceLabel}>per piece</Text>

            <View style={styles.drawerCreatorRow}>
              {item.creatorAvatar ? (
                <Image
                  source={{ uri: item.creatorAvatar }}
                  style={styles.drawerCreatorAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.drawerCreatorAvatar,
                    styles.drawerCreatorAvatarPlaceholder,
                  ]}
                >
                  <FontAwesome name="user" size={20} color={colors.gray[500]} />
                </View>
              )}
              <View style={styles.drawerCreatorInfo}>
                <Text style={styles.drawerCreatorName}>{item.creatorName}</Text>
                <Text style={styles.drawerCreatorTitle}>Designer</Text>
              </View>
            </View>

            {item.category ? (
              <View style={styles.drawerMetaRow}>
                <Text style={styles.drawerMetaLabel}>Category</Text>
                <Text style={styles.drawerMetaValue}>{item.category}</Text>
              </View>
            ) : null}

            <View style={styles.drawerCtaRow}>
              <Pressable
                onPress={handleMakeItNow}
                style={({ pressed }) => [
                  styles.drawerCta,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <FontAwesome name="magic" size={18} color="#FFFFFF" />
                <Text style={styles.drawerCtaText}>Make it now</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.drawerShareBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <FontAwesome
                  name="share-alt"
                  size={18}
                  color={colors.gray[700]}
                />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationCount] = useState(3);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onListLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const { height } = e.nativeEvent.layout;
      if (height > 0) setListHeight(height);
    },
    [],
  );

  const openProductDrawer = useCallback((item: FeedItem) => {
    setSelectedItem(item);
    setDrawerVisible(true);
  }, []);

  const closeProductDrawer = useCallback(() => {
    setDrawerVisible(false);
    setSelectedItem(null);
  }, []);

  const handleShare = useCallback(async (item: FeedItem) => {
    try {
      await Share.share({
        title: item.outfitName,
        message: `Check out ${item.outfitName} by ${item.creatorName}`,
      });
    } catch {
      // User cancelled
    }
  }, []);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await clothesApi.getList();
      const list = (res.data || []).map(wearToFeedItem);
      setFeed(list);
    } catch (e) {
      let message = "Failed to load feed. Pull to try again.";
      if (e instanceof ApiError) {
        message = e.message;
      } else if (e instanceof Error) {
        message = e.message || message;
      }
      setError(message);
      if (isRefresh) setFeed((prev) => prev);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleLike = useCallback((_item: FeedItem) => {
    // Like API is called inside FeedCard; this is for optional side effects (e.g. analytics).
  }, []);

  /** Each slide height = exact list viewport so one item fills screen and snaps (TikTok-style). */
  const feedHeight = listHeight;

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={[styles.slide, { height: feedHeight }]}>
        <FeedCard
          item={item}
          onPressMedia={() => openProductDrawer(item)}
          onLike={() => handleLike(item)}
        />
      </View>
    ),
    [feedHeight, handleLike, openProductDrawer],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: feedHeight,
      offset: feedHeight * index,
      index,
    }),
    [feedHeight],
  );

  if (loading && feed.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading fashion content...</Text>
      </View>
    );
  }

  if (error && feed.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => fetchFeed()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        style={[styles.topBar, { paddingTop: insets.top }]}
      >
        <View style={styles.topBarInner}>
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/logos/desynar-white.png")}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Desynar"
            />
            <Text style={styles.logoCatalog}> catalog</Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              hitSlop={MIN_TAP}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <FontAwesome name="bell" size={22} color="#FFFFFF" />
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              hitSlop={MIN_TAP}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <FontAwesome name="search" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {feed.length === 0 ? (
        <View style={[styles.centerContainer, styles.empty]}>
          <Text style={styles.emptyText}>No fashion content found.</Text>
        </View>
      ) : (
        <View style={styles.listWrap} onLayout={onListLayout}>
          <FlatList
            ref={listRef}
            data={feed}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            pagingEnabled
            snapToAlignment="start"
            snapToInterval={feedHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchFeed(true)}
                tintColor="#FFFFFF"
              />
            }
          />
        </View>
      )}

      <ProductDetailDrawer
        item={selectedItem}
        visible={drawerVisible}
        onClose={closeProductDrawer}
        onMakeItNow={() => {}}
        onShare={handleShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  listWrap: { flex: 1 },
  drawerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  drawerBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  drawerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: spacing[8],
    overflow: "hidden",
  },
  drawerSheetBlurWrap: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  drawerSheetGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  drawerHandleWrap: {
    alignItems: "center",
    paddingVertical: spacing[3],
    zIndex: 1,
  },
  drawerHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  drawerContent: {
    paddingHorizontal: spacing[6],
    zIndex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[4],
  },
  drawerTitle: {
    flex: 1,
    fontSize: typography.fontSize["2xl"],
    color: colors.gray[900],
    fontFamily: typography.fontFamily.bold,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  drawerPrice: {
    fontSize: 28,
    color: colors.primary[500],
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing[2],
  },
  drawerPriceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
    marginTop: 2,
  },
  drawerCreatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    gap: spacing[3],
  },
  drawerCreatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  drawerCreatorAvatarPlaceholder: {
    backgroundColor: colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCreatorInfo: { flex: 1 },
  drawerCreatorName: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    fontFamily: typography.fontFamily.medium,
  },
  drawerCreatorTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
    marginTop: 2,
  },
  drawerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[4],
  },
  drawerMetaLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.medium,
  },
  drawerMetaValue: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[900],
    fontFamily: typography.fontFamily.sans,
  },
  drawerCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginTop: spacing[6],
  },
  drawerCta: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
  },
  drawerCtaText: {
    fontSize: typography.fontSize.lg,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.bold,
  },
  drawerShareBtn: {
    flex: 0.2,
    aspectRatio: 1,
    maxHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[900],
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: typography.fontFamily.sans,
  },
  retryButton: {
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    color: "#FFFFFF",
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
  },
  empty: {},
  emptyText: {
    fontSize: typography.fontSize.base,
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.fontFamily.sans,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  logoImage: {
    height: 28,
    width: 100,
  },
  logoCatalog: {
    fontSize: typography.fontSize.lg,
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.fontFamily.sans,
  },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  iconBtn: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger[500],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  slide: { width: SCREEN_WIDTH },
  card: { flex: 1, width: SCREEN_WIDTH },
  media: { flex: 1, width: SCREEN_WIDTH, height: "100%" },
  mediaScrollContent: { flexGrow: 1 },
  mediaSlide: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gray[800],
    alignItems: "center",
    justifyContent: "center",
  },
  dotsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: DOTS_BOTTOM_OFFSET,
    alignItems: "center",
    zIndex: 2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dotTouch: {
    minWidth: DOT_HIT,
    minHeight: DOT_HIT,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOuter: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  vignetteRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    zIndex: 1,
  },
  actionsColumn: {
    position: "absolute",
    right: spacing[4],
    bottom: 100,
    alignItems: "center",
    gap: spacing[4],
    zIndex: 2,
  },
  actionBtn: {
    alignItems: "center",
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: typography.fontSize.xs,
    color: "#FFFFFF",
    marginTop: 2,
    fontFamily: typography.fontFamily.sans,
  },
  bottomInfoBackdrop: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    height: 72,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  bottomInfo: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  creatorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  outfitName: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.95)",
    marginTop: 2,
    fontFamily: typography.fontFamily.sans,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
