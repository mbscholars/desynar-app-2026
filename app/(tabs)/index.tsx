import { FeedCard } from "@/components/FeedCard";
import { UserLogin } from "@/components/UserLogin";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useMeasurementProfiles } from "@/context/MeasurementProfilesContext";
import { ApiError, clothesApi } from "@/services/api";
import type { CartProfile } from "@/types/cart";
import type { FeedItem } from "@/types/feed";
import { wearToFeedItem } from "@/types/feed";
import { getRelationshipLabel } from "@/types/measurement";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_TAP = 44;

/** Tab bar height from (tabs)/_layout.tsx so each slide height matches viewport. */
const TAB_BAR_HEIGHT = 64;

function formatPrice(
  amount: number | undefined,
  currency: string = "USD",
): string {
  if (amount == null) return "—";
  return `${currency} ${(amount / 100).toLocaleString()}`;
}

/** Format ISO date as "Mon YYYY" (e.g. "Feb 2026") for profile cards. */
function formatMonthYear(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${month} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

const DRAWER_SLIDE_DURATION = 250;

function ProductDetailDrawer({
  item,
  visible,
  onClose,
  onAddToCart,
  onMakeItNow,
  onShare,
}: {
  item: FeedItem | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (item: FeedItem, selectedProfiles: CartProfile[]) => void;
  onMakeItNow: (item: FeedItem, selectedProfiles: CartProfile[]) => void;
  onShare: (item: FeedItem) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profiles,
    isLoading: profilesLoading,
    refresh: refreshProfiles,
  } = useMeasurementProfiles();
  const [step, setStep] = useState<"product" | "profiles">("product");
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(),
  );
  const slideAnim = useRef(new Animated.Value(0)).current;

  // When product changes (e.g. new product opened), always show product view
  useEffect(() => {
    if (item) {
      setStep("product");
      setSelectedProfileIds(new Set());
      slideAnim.setValue(0);
    }
  }, [item?.id]);

  // When entering profiles step, refresh profiles and animate
  useEffect(() => {
    if (step === "profiles") {
      refreshProfiles();
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: DRAWER_SLIDE_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: DRAWER_SLIDE_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  const goToProfiles = useCallback(() => setStep("profiles"), []);
  const goBackToProduct = useCallback(() => setStep("product"), []);

  const toggleProfile = useCallback((id: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedProfilesForCart = useMemo(
    () =>
      profiles
        .filter((p) => selectedProfileIds.has(p.id))
        .map(
          (p): CartProfile => ({
            id: p.id,
            name: p.name,
            frontImageUri: p.frontImageUri ?? null,
            sideImageUri: p.sideImageUri ?? null,
          }),
        ),
    [profiles, selectedProfileIds],
  );

  const handleContinueToOrder = useCallback(() => {
    if (!item) return;
    onMakeItNow(item, selectedProfilesForCart);
    bottomSheetRef.current?.dismiss();
  }, [item, selectedProfilesForCart, onMakeItNow]);

  const handleAddToCart = useCallback(() => {
    if (!item || selectedProfileIds.size === 0) return;
    onAddToCart(item, selectedProfilesForCart);
    bottomSheetRef.current?.dismiss();
  }, [item, selectedProfileIds.size, selectedProfilesForCart, onAddToCart]);

  const handleShare = useCallback(() => {
    if (item) onShare(item);
  }, [item, onShare]);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const maxDynamicContentSize = useMemo(() => SCREEN_HEIGHT * 0.92, []);
  const minSheetHeight = 360;

  useEffect(() => {
    if (visible && item) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, item]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!item) {
    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxDynamicContentSize}
        onDismiss={handleDismiss}
        enablePanDownToClose
        handleComponent={null}
        backgroundStyle={styles.drawerSheetBackground}
        style={styles.drawerSheetContainer}
      >
        <BottomSheetView
          style={[styles.drawerSheet, { minHeight: minSheetHeight }]}
        >
          <View />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  const drawerContentWidth = SCREEN_WIDTH;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -drawerContentWidth],
  });

  const productPanel = (
    <View style={[styles.drawerPanel, { width: drawerContentWidth }]}>
      <View style={styles.drawerPanelContent}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle} numberOfLines={2}>
            {item.outfitName}
          </Text>
          <Pressable
            onPress={() => bottomSheetRef.current?.dismiss()}
            style={styles.drawerCloseBtn}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <FontAwesome name="times" size={18} color={colors.gray[700]} />
          </Pressable>
        </View>
        <Text style={styles.drawerPrice}>
          {formatPrice(item.price, item.currency)}
        </Text>
        <Text style={styles.drawerPriceLabel}>per piece</Text>

        <Text style={styles.drawerDescription} numberOfLines={4}>
          {item.description?.trim() || "Comfortable, versatile piece. Materials and care details can be added by the designer."}
        </Text>

        {item.tags && item.tags.length > 0 ? (
          <View style={styles.drawerTagsWrap}>
            {item.tags.map((tag) => (
              <Text key={tag} style={styles.drawerTag} numberOfLines={1}>
                {tag.startsWith("#") ? tag : `#${tag}`}
              </Text>
            ))}
          </View>
        ) : null}

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

        <View style={styles.drawerMetaRow}>
          <Text style={styles.drawerMetaLabel}>Estimated delivery</Text>
          <Text style={styles.drawerMetaValue}>7 days</Text>
        </View>
      </View>

      <View
        style={[
          styles.drawerCtaRow,
          { paddingBottom: Math.max(insets.bottom, spacing[4]) },
        ]}
      >
        <Pressable
          onPress={goToProfiles}
          style={({ pressed }) => [
            styles.drawerCta,
            pressed && { opacity: 0.9 },
          ]}
          accessibilityLabel="Make it now"
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
          accessibilityLabel="Share"
        >
          <FontAwesome name="share-alt" size={18} color={colors.gray[700]} />
        </Pressable>
      </View>
    </View>
  );

  const profilesPanel = (
    <View style={[styles.drawerPanel, { width: drawerContentWidth }]}>
      <View style={styles.drawerProfilesHeader}>
        <Pressable
          onPress={goBackToProduct}
          style={styles.drawerBackBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <FontAwesome name="arrow-left" size={20} color={colors.gray[700]} />
        </Pressable>
        <Text style={styles.drawerProfilesTitle}>Who is this for?</Text>
        <View style={styles.drawerBackBtnPlaceholder} />
      </View>

      {profilesLoading ? (
        <View style={styles.drawerProfilesLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.drawerProfilesLoadingText}>
            Loading profiles…
          </Text>
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.drawerProfilesEmpty}>
          <View style={styles.drawerProfilesEmptyIcon}>
            <FontAwesome name="user" size={32} color={colors.gray[400]} />
          </View>
          <Text style={styles.drawerProfilesEmptyTitle}>
            No measurement profiles
          </Text>
          <Text style={styles.drawerProfilesEmptyBody}>
            Create a measurement profile so we can make this piece for you. You
            only need to do it once.
          </Text>
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.dismiss();
              router.push("/measurements");
            }}
            style={({ pressed }) => [
              styles.drawerProfilesCreateBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <FontAwesome name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.drawerProfilesCreateBtnText}>
              Create a profile
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.drawerProfilesScroll}
            contentContainerStyle={styles.drawerProfilesScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                height:
                  ((drawerContentWidth - spacing[6] * 2 - spacing[2]) / 2) *
                  (4 / 3),
                minHeight: 120,
              }}
            >
              <FlatList
                data={profiles}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.drawerProfilesGridContent,
                  { paddingLeft: 0, paddingRight: spacing[4] },
                ]}
                style={styles.drawerProfilesScrollHorizontal}
                ItemSeparatorComponent={() => (
                  <View style={{ width: spacing[2] }} />
                )}
                renderItem={({ item: profile }) => {
                  const isSelected = selectedProfileIds.has(profile.id);
                  const thumbUri = profile.frontImageUri ?? null;
                  const relationshipLabel = getRelationshipLabel(
                    profile.relationship,
                    profile.relationshipCustom,
                  );
                  const monthYear = formatMonthYear(
                    profile.updatedAt || profile.createdAt,
                  );
                  const subtitle = monthYear
                    ? `${relationshipLabel} · ${monthYear}`
                    : relationshipLabel;
                  const cardWidth =
                    (drawerContentWidth - spacing[6] * 2 - spacing[2]) / 2;
                  return (
                    <Pressable
                      onPress={() => toggleProfile(profile.id)}
                      style={[
                        styles.drawerProfileBlock,
                        { width: cardWidth },
                        isSelected && styles.drawerProfileBlockSelected,
                      ]}
                    >
                      <View style={styles.drawerProfileBlockThumb}>
                        {thumbUri ? (
                          <Image
                            source={{ uri: thumbUri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                        ) : (
                          <FontAwesome
                            name="user"
                            size={28}
                            color={colors.gray[400]}
                          />
                        )}
                        <LinearGradient
                          colors={["rgba(0,0,0,0.75)", "transparent"]}
                          style={styles.drawerProfileBlockOverlay}
                        />
                        <View style={styles.drawerProfileBlockCaption}>
                          <Text
                            style={styles.drawerProfileBlockName}
                            numberOfLines={1}
                          >
                            {profile.name}
                          </Text>
                          <Text
                            style={styles.drawerProfileBlockSubtitle}
                            numberOfLines={1}
                          >
                            {subtitle}
                          </Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <View style={styles.drawerProfileBlockCheck}>
                          <FontAwesome
                            name="check"
                            size={12}
                            color={colors.primary[500]}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </ScrollView>
          <View
            style={[
              styles.drawerProfilesFooter,
              { paddingBottom: Math.max(insets.bottom, spacing[4]) },
            ]}
          >
            <View style={styles.drawerProfilesFooterRow}>
              <Pressable
                onPress={handleAddToCart}
                disabled={selectedProfileIds.size === 0}
                style={({ pressed }) => [
                  styles.drawerCtaSecondary,
                  selectedProfileIds.size === 0 && styles.drawerCtaDisabled,
                  pressed && selectedProfileIds.size > 0 && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.drawerCtaSecondaryText}>Add to Cart</Text>
              </Pressable>
              <Pressable
                onPress={handleContinueToOrder}
                disabled={selectedProfileIds.size === 0}
                style={({ pressed }) => [
                  styles.drawerCta,
                  selectedProfileIds.size === 0 && styles.drawerCtaDisabled,
                  pressed && selectedProfileIds.size > 0 && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.drawerCtaText}>Check out Now</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      maxDynamicContentSize={maxDynamicContentSize}
      onDismiss={handleDismiss}
      enablePanDownToClose
      handleComponent={null}
      backgroundStyle={styles.drawerSheetBackground}
      style={styles.drawerSheetContainer}
    >
      <BottomSheetView
        style={[styles.drawerSheet, { minHeight: minSheetHeight }]}
      >
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
        <View style={styles.drawerContentWrap}>
          <Animated.View
            style={[
              styles.drawerSlidingContent,
              {
                width: drawerContentWidth * 2,
                transform: [{ translateX }],
              },
            ]}
          >
            {productPanel}
            {profilesPanel}
          </Animated.View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, setAuthenticated } = useAuth();
  const { addItem, items: cartItems } = useCart();
  const listRef = useRef<FlatList>(null);
  const [listHeight, setListHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationCount] = useState(3);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      addItem(item, selectedProfiles, 1);
    },
    [addItem],
  );

  const handleMakeItNow = useCallback(
    (item: FeedItem, selectedProfiles: CartProfile[]) => {
      addItem(item, selectedProfiles, 1);
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
                hitSlop={MIN_TAP}
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
                hitSlop={MIN_TAP}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <FontAwesome name="search" size={22} color="#FFFFFF" />
              </Pressable>
              {cartItems.length > 0 && (
                <Pressable
                  hitSlop={MIN_TAP}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => router.push("/review")}
                  accessibilityRole="button"
                  accessibilityLabel="Cart"
                >
                  <FontAwesome name="shopping-cart" size={22} color="#FFFFFF" />
                  {cartItems.length > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {cartItems.length > 99 ? "99+" : cartItems.length}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
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
  drawerSheetContainer: {
    flex: 1,
  },
  drawerSheetBackground: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  drawerSheet: {
    minHeight: 300,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  drawerContentWrap: {
    flex: 1,
    overflow: "hidden",
    zIndex: 1,
  },
  drawerSlidingContent: {
    flex: 1,
    flexDirection: "row",
  },
  drawerPanel: {
    paddingHorizontal: spacing[6],
    flex: 1,
    justifyContent: "space-between",
  },
  drawerPanelContent: {
    flex: 1,
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
  drawerDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontFamily: typography.fontFamily.sans,
    lineHeight: 20,
    marginTop: spacing[4],
  },
  drawerTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  drawerTag: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    fontFamily: typography.fontFamily.sans,
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
    paddingTop: spacing[4],
  },
  drawerCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    backgroundColor: colors.primary[500],
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
  drawerCtaDisabled: {
    opacity: 0.5,
  },
  drawerProfilesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[4],
  },
  drawerBackBtn: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerBackBtnPlaceholder: {
    width: MIN_TAP,
    height: MIN_TAP,
  },
  drawerProfilesTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semibold,
    color: colors.gray[900],
  },
  drawerProfilesLoading: {
    paddingVertical: spacing[16],
    alignItems: "center",
    gap: spacing[3],
  },
  drawerProfilesLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
  },
  drawerProfilesEmpty: {
    paddingVertical: spacing[8],
    alignItems: "center",
    paddingHorizontal: spacing[4],
  },
  drawerProfilesEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  drawerProfilesEmptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.gray[900],
    marginBottom: spacing[2],
    textAlign: "center",
  },
  drawerProfilesEmptyBody: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[6],
    paddingHorizontal: spacing[2],
  },
  drawerProfilesCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 16,
    minHeight: MIN_TAP,
  },
  drawerProfilesCreateBtnText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: "#FFFFFF",
  },
  drawerProfilesScroll: {
    flex: 1,
    minHeight: 0,
  },
  drawerProfilesScrollContent: {
    paddingBottom: spacing[2],
  },
  drawerProfilesScrollHorizontal: {
    flex: 1,
    height: "100%",
  },
  drawerProfilesGridRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[2],
  },
  drawerProfilesGridContent: {
    paddingBottom: spacing[3],
  },
  drawerProfileBlock: {
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadows.soft,
    backgroundColor: colors.gray[50],
  },
  drawerProfileBlockSelected: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  drawerProfileBlockThumb: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  drawerProfileBlockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
  },
  drawerProfileBlockCaption: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    padding: spacing[2],
    paddingBottom: spacing[4],
  },
  drawerProfileBlockName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: "#FFFFFF",
  },
  drawerProfileBlockSubtitle: {
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.fontFamily.sans,
    marginTop: 2,
  },
  drawerProfileBlockCheck: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerProfilesFooter: {
    paddingTop: spacing[4],
    paddingHorizontal: 0,
  },
  drawerProfilesFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  drawerCtaSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: "transparent",
  },
  drawerCtaSecondaryText: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontFamily: typography.fontFamily.semibold,
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
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
