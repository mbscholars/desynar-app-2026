import {
  colors,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useMeasurementProfiles } from "@/context/MeasurementProfilesContext";
import { ApiError, clothesApi } from "@/services/api";
import { tryOnGenerate } from "@/services/api/tryon";
import type { FeedItem } from "@/types/feed";
import type { MeasurementProfileStatic } from "@/types/measurement";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
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

/** Wear profile selector — luxury palette */
const WEAR_AVATAR_SIZE = 46;
const WEAR_SURFACE = "#232325";
const WEAR_BORDER = "#3A3A3C";
const WEAR_SELECTED_BORDER = "#BFC3C8";
const WEAR_STAGGER_MS = 100;
const WEAR_MAX_VISIBLE = 4;

function getProfileInitials(profile: MeasurementProfileStatic): string {
  const name = (profile.name ?? "").trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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

function WearAvatarBubble({
  profile,
  isSelected,
  onPress,
  style,
}: {
  profile: MeasurementProfileStatic;
  isSelected?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const uri = profile.frontImageUri ?? null;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wearBubble,
        isSelected && styles.wearBubbleSelected,
        style,
      ]}
      hitSlop={8}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.wearBubbleImage}
          accessibilityLabel={profile.name}
        />
      ) : (
        <Text style={styles.wearBubbleInitials} numberOfLines={1}>
          {getProfileInitials(profile)}
        </Text>
      )}
      {isSelected && <View style={styles.wearBubbleCheck} />}
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
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { profiles } = useMeasurementProfiles();
  const [liked, setLiked] = useState(item.isLiked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [walkVideoUrl, setWalkVideoUrl] = useState<string | null>(null);
  const [walkLoading, setWalkLoading] = useState(false);
  const [wearPickerOpen, setWearPickerOpen] = useState(false);
  const [moreProfilesModalOpen, setMoreProfilesModalOpen] = useState(false);
  const [tryOnOverlayMessage, setTryOnOverlayMessage] = useState<string | null>(
    null,
  );
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [prependedTryOnUrls, setPrependedTryOnUrls] = useState<string[]>([]);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const breathingAnim = useRef(new Animated.Value(1)).current;
  const wearStaggerAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0)),
  ).current;
  const mediaScrollRef = useRef<ScrollView>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );
  const didScrollRef = useRef(false);

  const garmentImageUri =
    item.imageUri || item.mediaUrls?.[0] || "";

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
  const baseUrls = walkVideoUrl ? [walkVideoUrl, ...mediaUrls] : mediaUrls;
  const effectiveUrls = [...prependedTryOnUrls, ...baseUrls];

  useEffect(() => {
    setLiked(item.isLiked);
    setLikeCount(item.likes);
  }, [item.id, item.isLiked, item.likes]);

  useEffect(() => {
    setCurrentMediaIndex(0);
    setWalkVideoUrl(null);
    setPrependedTryOnUrls([]);
  }, [item.id]);

  /** Breathing animation while try-on is in progress */
  useEffect(() => {
    if (!tryOnLoading) {
      breathingAnim.setValue(1);
      return;
    }
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 0.97,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: false },
    );
    breathing.start();
    return () => breathing.stop();
  }, [tryOnLoading, breathingAnim]);

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
      const walkIndex = prependedTryOnUrls.length;
      setCurrentMediaIndex(walkIndex);
      mediaScrollRef.current?.scrollTo({
        x: walkIndex * SCREEN_WIDTH,
        animated: true,
      });
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
  }, [item.id, walkLoading, prependedTryOnUrls.length]);

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

  const closeWearPicker = useCallback(() => {
    setWearPickerOpen(false);
    setMoreProfilesModalOpen(false);
  }, []);

  const runTryOn = useCallback(
    async (profile: MeasurementProfileStatic) => {
      closeWearPicker();
      const modelImage = profile.frontImageUri;
      if (!modelImage) {
        Alert.alert(
          "No avatar photo",
          "Add a front view photo for this profile in Measurements to try on.",
          [{ text: "OK" }],
        );
        return;
      }
      if (!garmentImageUri) {
        Alert.alert("No outfit image", "This item has no image to try on.");
        return;
      }
      setTryOnError(null);
      setTryOnOverlayMessage(`Fitting outfit to ${profile.name}…`);
      setTryOnLoading(true);
      try {
        const result = await tryOnGenerate(
          {
            model_image: modelImage,
            garment_image: garmentImageUri,
            category: "auto",
            mode: "balanced",
            num_samples: 1,
          },
          (update) => {
            if (update.status === "IN_QUEUE")
              setTryOnOverlayMessage("Waiting in queue…");
            else if (update.logs?.length)
              setTryOnOverlayMessage(
                update.logs[update.logs.length - 1].message ?? "Fitting…",
              );
          },
        );
        if (result.success && result.data?.images?.length) {
          const resultUrl = result.data.images[0].url;
          setTryOnError(null);
          setPrependedTryOnUrls((prev) => [resultUrl, ...prev]);
          setCurrentMediaIndex(0);
          mediaScrollRef.current?.scrollTo({ x: 0, animated: true });
        } else {
          setTryOnError(result.error ?? "Try-on failed");
        }
      } catch (e) {
        setTryOnError(e instanceof Error ? e.message : "Try-on failed");
      } finally {
        setTryOnLoading(false);
        setTryOnOverlayMessage(null);
      }
    },
    [garmentImageUri, closeWearPicker],
  );

  const handleWearPress = useCallback(() => {
    if (!isAuthenticated) return;
    if (profiles.length === 0) {
      Alert.alert(
        "Add a profile",
        "Add a measurement profile to try this outfit on.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add profile",
            onPress: () =>
              (router.push as (path: string) => void)("/measurements/create"),
          },
        ],
      );
      return;
    }
    if (profiles.length === 1) {
      runTryOn(profiles[0]);
      return;
    }
    setWearPickerOpen((open) => !open);
  }, [isAuthenticated, profiles, runTryOn, router]);

  const visibleProfiles = profiles.slice(0, WEAR_MAX_VISIBLE);
  const hasMoreProfiles = profiles.length > WEAR_MAX_VISIBLE;
  const overflowProfiles = profiles.slice(WEAR_MAX_VISIBLE);
  const wearStackCount =
    visibleProfiles.length + (hasMoreProfiles ? 1 : 0) + 1 + 1;

  useEffect(() => {
    if (!wearPickerOpen) return;
    wearStaggerAnims.forEach((a) => a.setValue(0));
    const animations = wearStaggerAnims.slice(0, wearStackCount).map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        delay: i * WEAR_STAGGER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [wearPickerOpen, wearStackCount]);

  const wearStaggerStyle = (index: number) => ({
    opacity: wearStaggerAnims[index],
    transform: [
      {
        translateY: wearStaggerAnims[index].interpolate({
          inputRange: [0, 1],
          outputRange: [WEAR_AVATAR_SIZE + spacing[4], 0],
        }),
      },
    ],
  });

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
            {walkVideoUrl && i === prependedTryOnUrls.length ? (
              <WalkVideoSlide uri={uri} />
            ) : (
              <ImageBackground
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
            {tryOnLoading && i === currentMediaIndex && (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    transform: [{ scale: breathingAnim }],
                  },
                ]}
                pointerEvents="none"
              >
                {Platform.OS === "web" ? (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: "rgba(0,0,0,0.6)" },
                    ]}
                  />
                ) : (
                  <BlurView
                    intensity={64}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={styles.tryOnBreathingPill}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.tryOnBreathingText} numberOfLines={1}>
                    {tryOnOverlayMessage ?? "Fitting…"}
                  </Text>
                </View>
              </Animated.View>
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
        {tryOnLoading && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ scale: breathingAnim }] },
            ]}
            pointerEvents="none"
          >
            {Platform.OS === "web" ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(0,0,0,0.6)" },
                ]}
              />
            ) : (
              <BlurView
                intensity={64}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={styles.tryOnBreathingPill}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.tryOnBreathingText} numberOfLines={1}>
                {tryOnOverlayMessage ?? "Fitting…"}
              </Text>
            </View>
          </Animated.View>
        )}
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

      {/* Tap outside rail to collapse Wear picker */}
      {wearPickerOpen && (
        <Pressable
          style={styles.wearTapOutside}
          onPress={closeWearPicker}
          accessible={false}
        />
      )}

      <View style={styles.actionsColumn} pointerEvents="box-none">
        {wearPickerOpen ? (
          <>
            {visibleProfiles.map((profile, i) => (
              <Animated.View
                key={profile.id}
                style={[styles.wearStackItem, wearStaggerStyle(i)]}
              >
                <WearAvatarBubble
                  profile={profile}
                  onPress={() => runTryOn(profile)}
                />
              </Animated.View>
            ))}
            {hasMoreProfiles && (
              <Animated.View
                style={[styles.wearStackItem, wearStaggerStyle(visibleProfiles.length)]}
              >
                <Pressable
                  onPress={() => setMoreProfilesModalOpen(true)}
                  style={styles.wearBubbleMore}
                  hitSlop={8}
                >
                  <Text style={styles.wearBubbleMoreText}>…</Text>
                </Pressable>
              </Animated.View>
            )}
            <Animated.View
              style={[
                styles.wearStackItem,
                wearStaggerStyle(
                  visibleProfiles.length + (hasMoreProfiles ? 1 : 0),
                ),
              ]}
            >
              <Pressable
                onPress={() =>
                  (router.push as (path: string) => void)("/measurements/create")
                }
                style={styles.wearBubbleAdd}
                hitSlop={8}
              >
                <FontAwesome name="plus" size={22} color={WEAR_BORDER} />
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={closeWearPicker}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="times" size={26} color="#FFFFFF" />
              <Text style={styles.actionLabel}>Close</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={handleWearPress}
              disabled={!isAuthenticated}
              style={({ pressed }) => [
                styles.actionBtn,
                (pressed || !isAuthenticated) && { opacity: 0.6 },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="user" size={26} color="#FFFFFF" />
              <Text style={styles.actionLabel}>Wear</Text>
            </Pressable>
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
          </>
        )}
      </View>

      {/* Try-on error toast */}
      {tryOnError && (
        <View style={styles.wearErrorWrap} pointerEvents="box-none">
          <View style={styles.wearErrorBubble}>
            <Text style={styles.wearErrorText}>{tryOnError}</Text>
            <Pressable
              onPress={() => setTryOnError(null)}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              <FontAwesome name="times" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* More profiles bottom sheet */}
      <Modal
        visible={moreProfilesModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreProfilesModalOpen(false)}
      >
        <Pressable
          style={styles.wearMoreBackdrop}
          onPress={() => setMoreProfilesModalOpen(false)}
        >
          <Pressable
            style={styles.wearMoreSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.wearMoreTitle}>Choose profile</Text>
            <ScrollView
              style={styles.wearMoreScroll}
              contentContainerStyle={styles.wearMoreScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {overflowProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => {
                    runTryOn(profile);
                    setMoreProfilesModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.wearMoreRow,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {profile.frontImageUri ? (
                    <Image
                      source={{ uri: profile.frontImageUri }}
                      style={styles.wearMoreRowImage}
                    />
                  ) : (
                    <View style={styles.wearMoreRowPlaceholder}>
                      <Text style={styles.wearMoreRowInitials}>
                        {getProfileInitials(profile)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.wearMoreRowName} numberOfLines={1}>
                    {profile.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
  wearTapOutside: {
    position: "absolute",
    left: 0,
    right: 70,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  wearStackItem: {
    marginBottom: spacing[2],
  },
  wearBubble: {
    width: WEAR_AVATAR_SIZE,
    height: WEAR_AVATAR_SIZE,
    borderRadius: WEAR_AVATAR_SIZE / 2,
    backgroundColor: WEAR_SURFACE,
    borderWidth: 1,
    borderColor: WEAR_BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  wearBubbleSelected: {
    borderWidth: 2,
    borderColor: WEAR_SELECTED_BORDER,
  },
  wearBubbleImage: {
    width: WEAR_AVATAR_SIZE,
    height: WEAR_AVATAR_SIZE,
    borderRadius: WEAR_AVATAR_SIZE / 2,
  },
  wearBubbleInitials: {
    fontSize: typography.fontSize.sm,
    color: WEAR_SELECTED_BORDER,
    fontFamily: typography.fontFamily.sans,
  },
  wearBubbleCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: WEAR_SELECTED_BORDER,
  },
  wearBubbleMore: {
    width: WEAR_AVATAR_SIZE,
    height: WEAR_AVATAR_SIZE,
    borderRadius: WEAR_AVATAR_SIZE / 2,
    backgroundColor: WEAR_SURFACE,
    borderWidth: 1,
    borderColor: WEAR_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  wearBubbleMoreText: {
    fontSize: typography.fontSize.lg,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
  },
  wearBubbleAdd: {
    width: WEAR_AVATAR_SIZE,
    height: WEAR_AVATAR_SIZE,
    borderRadius: WEAR_AVATAR_SIZE / 2,
    backgroundColor: WEAR_SURFACE,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: WEAR_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  tryOnBreathingPill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  tryOnBreathingText: {
    fontSize: typography.fontSize.sm,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
    maxWidth: SCREEN_WIDTH * 0.7,
    textAlign: "center",
  },
  wearErrorWrap: {
    position: "absolute",
    left: spacing[4],
    right: 80,
    bottom: 100,
    zIndex: 5,
    alignItems: "flex-start",
  },
  wearErrorBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    maxWidth: "100%",
  },
  wearErrorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
  },
  wearMoreBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  wearMoreSheet: {
    backgroundColor: WEAR_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: spacing[8],
  },
  wearMoreTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  wearMoreScroll: {
    maxHeight: 320,
  },
  wearMoreScrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  wearMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: 12,
  },
  wearMoreRowImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WEAR_BORDER,
  },
  wearMoreRowPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WEAR_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  wearMoreRowInitials: {
    fontSize: typography.fontSize.base,
    color: WEAR_SELECTED_BORDER,
    fontFamily: typography.fontFamily.sans,
  },
  wearMoreRowName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: "#FFFFFF",
    fontFamily: typography.fontFamily.sans,
  },
});
