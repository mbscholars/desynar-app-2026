import { colors, spacing, typography } from "@/constants/theme";
import type { WearResponse } from "@/services/api";
import { ApiError, clothesApi } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
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
  /** All media URLs for carousel (imageUri is mediaUrls[0] when present). */
  mediaUrls: string[];
  creatorName: string;
  outfitName: string;
  likes: number;
  isLiked: boolean;
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
    outfitName: w.name,
    likes: w.likes_count ?? 0,
    isLiked: w.is_liked ?? false,
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

      <View style={styles.bottomGradient} pointerEvents="none" />
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
  const [notificationCount] = useState(3);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onListLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setListHeight(height);
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
          onPressMedia={() => {}}
          onLike={() => handleLike(item)}
        />
      </View>
    ),
    [feedHeight, handleLike],
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  listWrap: { flex: 1 },
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
  actionsColumn: {
    position: "absolute",
    right: spacing[4],
    bottom: 100,
    alignItems: "center",
    gap: spacing[4],
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
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
    backgroundColor: "rgba(0,0,0,0.35)",
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
  },
  outfitName: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    fontFamily: typography.fontFamily.sans,
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
