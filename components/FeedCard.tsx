import {
  colors,
  spacing,
  typography,
} from "@/constants/theme";
import { ApiError, clothesApi } from "@/services/api";
import type { FeedItem } from "@/types/feed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MIN_TAP = 44;
const DOT_SIZE = 5;
const DOT_HIT = 20;
/** Dots sit above the bottom info (from bottom of card). */
const DOTS_BOTTOM_OFFSET = 140;

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

export type FeedCardProps = {
  item: FeedItem;
  onPressMedia: () => void;
  onLike: () => void;
};

export function FeedCard({ item, onPressMedia, onLike }: FeedCardProps) {
  const [liked, setLiked] = useState(item.isLiked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [walkVideoUrl, setWalkVideoUrl] = useState<string | null>(null);
  const [walkLoading, setWalkLoading] = useState(false);
  const mediaScrollRef = useRef<ScrollView>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const didScrollRef = useRef(false);

  const TAP_MAX_DURATION_MS = 400;
  const TAP_MAX_MOVE_PX = 25;

  const handleMediaTouchStart = useCallback(
    (e: { nativeEvent: { touches: { pageX: number; pageY: number }[] } }) => {
      const t = e.nativeEvent.touches[0];
      if (t) {
        touchStartRef.current = {
          time: Date.now(),
          x: t.pageX,
          y: t.pageY,
        };
        didScrollRef.current = false;
      }
    },
    [],
  );

  const handleMediaTouchEnd = useCallback(
    (e: {
      nativeEvent: { changedTouches: { pageX: number; pageY: number }[] };
    }) => {
      const start = touchStartRef.current;
      if (!start) return;
      const ct = e.nativeEvent.changedTouches[0];
      if (!ct) return;
      const dx = ct.pageX - start.x;
      const dy = ct.pageY - start.y;
      const duration = Date.now() - start.time;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (
        !didScrollRef.current &&
        duration < TAP_MAX_DURATION_MS &&
        distance < TAP_MAX_MOVE_PX
      ) {
        onPressMedia();
      }
      touchStartRef.current = null;
      didScrollRef.current = false;
    },
    [onPressMedia],
  );

  const handleScrollBeginDrag = useCallback(() => {
    didScrollRef.current = true;
  }, []);

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
        onScrollBeginDrag={handleScrollBeginDrag}
        onTouchStart={handleMediaTouchStart}
        onTouchEnd={handleMediaTouchEnd}
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
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={handleMediaTouchStart}
        onTouchEnd={handleMediaTouchEnd}
      >
        <ImageBackground
          source={{ uri: effectiveUrls[0] }}
          style={styles.media}
          resizeMode="cover"
        />
      </View>
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
        {item.creatorAvatar ? (
          <Image
            source={{ uri: item.creatorAvatar }}
            style={styles.avatar}
            accessibilityLabel={item.creatorName}
          />
        ) : (
          <View style={styles.avatar}>
            <FontAwesome name="user" size={20} color={colors.primary[500]} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, width: SCREEN_WIDTH },
  media: { flex: 1, width: SCREEN_WIDTH, height: "100%" },
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
