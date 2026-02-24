import { FeedCard } from "@/components/FeedCard";
import { ProductDetailDrawer } from "@/components/ProductDetailDrawer";
import { UserLogin } from "@/components/UserLogin";
import { colors, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useOutfitUpload } from "@/context/OutfitUploadContext";
import { ApiError, clothesApi, notificationsApi } from "@/services/api";
import type { CartProfile } from "@/types/cart";
import type { FeedItem } from "@/types/feed";
import { wearToFeedItem } from "@/types/feed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_TAP = 44;
/** Smaller hit slop for header icons so Search and Cart touch areas don’t overlap. */
const HEADER_ICON_HIT_SLOP = 8;

/** Tab bar height from (tabs)/_layout.tsx so each slide height matches viewport. */
const TAB_BAR_HEIGHT = 64;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, setAuthenticated } = useAuth();
  const { addItem, items: cartItems } = useCart();
  const listRef = useRef<FlatList>(null);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { uploadedItem, pendingViewProductId, setPendingViewProductId } = useOutfitUpload();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  /** Display list: uploaded outfit first (if any), then API feed. */
  const displayFeed = useMemo(
    () => (uploadedItem ? [uploadedItem, ...feed] : feed),
    [uploadedItem, feed],
  );

  const prevCartCountRef = useRef<number | null>(null);
  const cartScale = useRef(new Animated.Value(1)).current;

  const triggerCartBubble = useCallback(() => {
    cartScale.setValue(1);
    Animated.sequence([
      Animated.timing(cartScale, {
        toValue: 1.35,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(cartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 200,
      }),
    ]).start();
  }, [cartScale]);

  useEffect(() => {
    const count = cartItems.length;
    if (prevCartCountRef.current === null) {
      prevCartCountRef.current = count;
      return;
    }
    if (prevCartCountRef.current !== count) {
      triggerCartBubble();
      prevCartCountRef.current = count;
    }
  }, [cartItems.length, triggerCartBubble]);

  /** Fetch notification unread count when tab is focused (and user is logged in). */
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setNotificationCount(0);
        return;
      }
      notificationsApi
        .getUnreadCount()
        .then((res) => setNotificationCount(res.count ?? 0))
        .catch(() => setNotificationCount(0));
    }, [isAuthenticated]),
  );

  /** When landing with pendingViewProductId (e.g. after "Add to catalog" → View), fetch that product and open its drawer. */
  useFocusEffect(
    useCallback(() => {
      const id = pendingViewProductId;
      if (id == null) return;
      setPendingViewProductId(null);
      clothesApi
        .getById(id)
        .then((res) => {
          if (res?.data) {
            const feedItem = wearToFeedItem(res.data);
            setSelectedItem(feedItem);
            setDrawerVisible(true);
          }
        })
        .catch(() => {});
    }, [pendingViewProductId, setPendingViewProductId]),
  );

  /** Show login modal after 3s of activity when not authenticated. */
  useEffect(() => {
    if (!isAuthenticated) {
      const t = setTimeout(() => setShowLoginModal(true), 3000);
      return () => clearTimeout(t);
    }
    setShowLoginModal(false);
  }, [isAuthenticated]);

  /** Close login modal = continue as guest. */
  const handleLoginClose = useCallback(() => {
    setAuthenticated(true);
  }, [setAuthenticated]);

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

  const handleAddToCart = useCallback(
    (item: FeedItem, selectedProfiles: CartProfile[]) => {
      addItem(
        { ...item, outfit_source: item.outfitSource } as Parameters<typeof addItem>[0],
        selectedProfiles,
        1,
      );
    },
    [addItem],
  );

  const handleMakeItNow = useCallback(
    (item: FeedItem, selectedProfiles: CartProfile[]) => {
      addItem(
        { ...item, outfit_source: item.outfitSource } as Parameters<typeof addItem>[0],
        selectedProfiles,
        1,
      );
      (router.push as (href: string) => void)("/review");
    },
    [addItem, router],
  );

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

  const keyExtractor = useCallback((item: FeedItem) => {
    return item.outfitSource === "upload" ? `upload_${item.id}` : String(item.id);
  }, []);

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
    <>
      <Modal
        visible={!isAuthenticated && showLoginModal}
        animationType="slide"
        onRequestClose={handleLoginClose}
        statusBarTranslucent
        transparent
      >
        <View style={styles.loginModalWrap}>
          <UserLogin onClose={handleLoginClose} />
        </View>
      </Modal>
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
              {/* <Text style={styles.logoCatalog}> catalog</Text> */}
            </View>
            <View style={styles.topBarRight}>
              <Pressable
                hitSlop={HEADER_ICON_HIT_SLOP}
                onPress={() => router.push("/notifications")}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
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
                hitSlop={HEADER_ICON_HIT_SLOP}
                onPress={() => router.push("/search")}
                style={({ pressed }) => [
                  styles.iconBtn,
                  styles.iconBtnSearch,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <FontAwesome name="search" size={22} color="#FFFFFF" />
              </Pressable>
              {cartItems.length > 0 && (
                <Animated.View
                  style={[styles.iconBtnWrap, { transform: [{ scale: cartScale }] }]}
                >
                  <Pressable
                    hitSlop={HEADER_ICON_HIT_SLOP}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => router.push("/review")}
                    accessibilityRole="button"
                    accessibilityLabel="Cart"
                  >
                    <FontAwesome name="shopping-cart" size={22} color="#FFFFFF" />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {cartItems.length > 99 ? "99+" : cartItems.length}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              )}
            </View>
          </View>
        </LinearGradient>

        {displayFeed.length === 0 ? (
          <View style={[styles.centerContainer, styles.empty]}>
            <Text style={styles.emptyText}>No fashion content found.</Text>
          </View>
        ) : (
          <View style={styles.listWrap} onLayout={onListLayout}>
            <FlatList
              ref={listRef}
              data={displayFeed}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
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
          onAddToCart={handleAddToCart}
          onMakeItNow={handleMakeItNow}
          onShare={handleShare}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  loginModalWrap: { flex: 1 },
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
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    minHeight: 44,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  logoImage: {
    height: 26,
    width: 90,
  },
  logoCatalog: {
    fontSize: typography.fontSize.base,
    color: "rgba(255,255,255,0.85)",
    fontFamily: typography.fontFamily.sans,
    marginLeft: spacing[2],
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  iconBtnWrap: {
    width: 44,
    height: 44,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Search sits between Notifications and Cart; higher zIndex so taps hit Search, not Cart. */
  iconBtnSearch: {
    zIndex: 1,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
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
});
