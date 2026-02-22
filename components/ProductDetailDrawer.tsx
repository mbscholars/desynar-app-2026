import type { CartProfile } from "@/types/cart";
import type { FeedItem } from "@/types/feed";
import { getRelationshipLabel } from "@/types/measurement";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMeasurementProfiles } from "@/context/MeasurementProfilesContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MIN_TAP = 44;
const DRAWER_SLIDE_DURATION = 250;

function formatPrice(
  amount: number | undefined,
  currency: string = "USD",
): string {
  if (amount == null) return "—";
  return `${currency} ${(amount / 100).toLocaleString()}`;
}

function formatMonthYear(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.toLocaleString("en-US", { month: "short" });
    return `${month} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

export function ProductDetailDrawer({
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

  useEffect(() => {
    if (item) {
      setStep("product");
      setSelectedProfileIds(new Set());
      slideAnim.setValue(0);
    }
  }, [item?.id, slideAnim]);

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
  }, [step, slideAnim, refreshProfiles]);

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
        backgroundStyle={drawerStyles.drawerSheetBackground}
        style={drawerStyles.drawerSheetContainer}
      >
        <BottomSheetView
          style={[drawerStyles.drawerSheet, { minHeight: minSheetHeight }]}
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
    <View style={[drawerStyles.drawerPanel, { width: drawerContentWidth }]}>
      <View style={drawerStyles.drawerPanelContent}>
        <View style={drawerStyles.drawerHeader}>
          <Text style={drawerStyles.drawerTitle} numberOfLines={2}>
            {item.outfitName}
          </Text>
          <Pressable
            onPress={() => bottomSheetRef.current?.dismiss()}
            style={drawerStyles.drawerCloseBtn}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <FontAwesome name="times" size={18} color={colors.gray[700]} />
          </Pressable>
        </View>
        <Text style={drawerStyles.drawerPrice}>
          {formatPrice(item.price, item.currency)}
        </Text>
        <Text style={drawerStyles.drawerPriceLabel}>per piece</Text>

        <Text style={drawerStyles.drawerDescription} numberOfLines={4}>
          {item.description?.trim() ||
            "Comfortable, versatile piece. Materials and care details can be added by the designer."}
        </Text>

        {item.tags && item.tags.length > 0 ? (
          <View style={drawerStyles.drawerTagsWrap}>
            {item.tags.map((tag) => (
              <Text key={tag} style={drawerStyles.drawerTag} numberOfLines={1}>
                {tag.startsWith("#") ? tag : `#${tag}`}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={drawerStyles.drawerCreatorRow}>
          {item.creatorAvatar ? (
            <Image
              source={{ uri: item.creatorAvatar }}
              style={drawerStyles.drawerCreatorAvatar}
            />
          ) : (
            <View
              style={[
                drawerStyles.drawerCreatorAvatar,
                drawerStyles.drawerCreatorAvatarPlaceholder,
              ]}
            >
              <FontAwesome name="user" size={20} color={colors.gray[500]} />
            </View>
          )}
          <View style={drawerStyles.drawerCreatorInfo}>
            <Text style={drawerStyles.drawerCreatorName}>{item.creatorName}</Text>
            <Text style={drawerStyles.drawerCreatorTitle}>Designer</Text>
          </View>
        </View>

        {item.category ? (
          <View style={drawerStyles.drawerMetaRow}>
            <Text style={drawerStyles.drawerMetaLabel}>Category</Text>
            <Text style={drawerStyles.drawerMetaValue}>{item.category}</Text>
          </View>
        ) : null}

        <View style={drawerStyles.drawerMetaRow}>
          <Text style={drawerStyles.drawerMetaLabel}>Estimated delivery</Text>
          <Text style={drawerStyles.drawerMetaValue}>7 days</Text>
        </View>
      </View>

      <View
        style={[
          drawerStyles.drawerCtaRow,
          { paddingBottom: Math.max(insets.bottom, spacing[4]) },
        ]}
      >
        <Pressable
          onPress={goToProfiles}
          style={({ pressed }) => [
            drawerStyles.drawerCta,
            pressed && { opacity: 0.9 },
          ]}
          accessibilityLabel="Make it now"
        >
          <FontAwesome name="magic" size={18} color="#FFFFFF" />
          <Text style={drawerStyles.drawerCtaText}>Make it now</Text>
        </Pressable>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            drawerStyles.drawerShareBtn,
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
    <View style={[drawerStyles.drawerPanel, { width: drawerContentWidth }]}>
      <View style={drawerStyles.drawerProfilesHeader}>
        <Pressable
          onPress={goBackToProduct}
          style={drawerStyles.drawerBackBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <FontAwesome name="arrow-left" size={20} color={colors.gray[700]} />
        </Pressable>
        <Text style={drawerStyles.drawerProfilesTitle}>Who is this for?</Text>
        <View style={drawerStyles.drawerBackBtnPlaceholder} />
      </View>

      {profilesLoading ? (
        <View style={drawerStyles.drawerProfilesLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={drawerStyles.drawerProfilesLoadingText}>
            Loading profiles…
          </Text>
        </View>
      ) : profiles.length === 0 ? (
        <View style={drawerStyles.drawerProfilesEmpty}>
          <View style={drawerStyles.drawerProfilesEmptyIcon}>
            <FontAwesome name="user" size={32} color={colors.gray[400]} />
          </View>
          <Text style={drawerStyles.drawerProfilesEmptyTitle}>
            No measurement profiles
          </Text>
          <Text style={drawerStyles.drawerProfilesEmptyBody}>
            Create a measurement profile so we can make this piece for you. You
            only need to do it once.
          </Text>
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.dismiss();
              router.push("/measurements");
            }}
            style={({ pressed }) => [
              drawerStyles.drawerProfilesCreateBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <FontAwesome name="plus" size={18} color="#FFFFFF" />
            <Text style={drawerStyles.drawerProfilesCreateBtnText}>
              Create a profile
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={drawerStyles.drawerProfilesScroll}
            contentContainerStyle={drawerStyles.drawerProfilesScrollContent}
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
                  drawerStyles.drawerProfilesGridContent,
                  { paddingLeft: 0, paddingRight: spacing[4] },
                ]}
                style={drawerStyles.drawerProfilesScrollHorizontal}
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
                        drawerStyles.drawerProfileBlock,
                        { width: cardWidth },
                        isSelected && drawerStyles.drawerProfileBlockSelected,
                      ]}
                    >
                      <View style={drawerStyles.drawerProfileBlockThumb}>
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
                          style={drawerStyles.drawerProfileBlockOverlay}
                        />
                        <View style={drawerStyles.drawerProfileBlockCaption}>
                          <Text
                            style={drawerStyles.drawerProfileBlockName}
                            numberOfLines={1}
                          >
                            {profile.name}
                          </Text>
                          <Text
                            style={drawerStyles.drawerProfileBlockSubtitle}
                            numberOfLines={1}
                          >
                            {subtitle}
                          </Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <View style={drawerStyles.drawerProfileBlockCheck}>
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
              drawerStyles.drawerProfilesFooter,
              { paddingBottom: Math.max(insets.bottom, spacing[4]) },
            ]}
          >
            <View style={drawerStyles.drawerProfilesFooterRow}>
              <Pressable
                onPress={handleAddToCart}
                disabled={selectedProfileIds.size === 0}
                style={({ pressed }) => [
                  drawerStyles.drawerCtaSecondary,
                  selectedProfileIds.size === 0 && drawerStyles.drawerCtaDisabled,
                  pressed && selectedProfileIds.size > 0 && { opacity: 0.9 },
                ]}
              >
                <Text style={drawerStyles.drawerCtaSecondaryText}>
                  Add to Cart
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinueToOrder}
                disabled={selectedProfileIds.size === 0}
                style={({ pressed }) => [
                  drawerStyles.drawerCta,
                  selectedProfileIds.size === 0 && drawerStyles.drawerCtaDisabled,
                  pressed && selectedProfileIds.size > 0 && { opacity: 0.9 },
                ]}
              >
                <Text style={drawerStyles.drawerCtaText}>Check out Now</Text>
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
      backgroundStyle={drawerStyles.drawerSheetBackground}
      style={drawerStyles.drawerSheetContainer}
    >
      <BottomSheetView
        style={[drawerStyles.drawerSheet, { minHeight: minSheetHeight }]}
      >
        <View style={drawerStyles.drawerSheetBlurWrap}>
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          <View style={drawerStyles.drawerSheetGlassOverlay} />
        </View>
        <View style={drawerStyles.drawerHandleWrap}>
          <View style={drawerStyles.drawerHandle} />
        </View>
        <View style={drawerStyles.drawerContentWrap}>
          <Animated.View
            style={[
              drawerStyles.drawerSlidingContent,
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

const drawerStyles = StyleSheet.create({
  drawerSheetContainer: { flex: 1 },
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
  drawerContentWrap: { flex: 1, overflow: "hidden", zIndex: 1 },
  drawerSlidingContent: { flex: 1, flexDirection: "row" },
  drawerPanel: {
    paddingHorizontal: spacing[6],
    flex: 1,
    justifyContent: "space-between",
  },
  drawerPanelContent: { flex: 1 },
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
  drawerCreatorAvatar: { width: 48, height: 48, borderRadius: 24 },
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
  drawerCtaDisabled: { opacity: 0.5 },
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
  drawerBackBtnPlaceholder: { width: MIN_TAP, height: MIN_TAP },
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
  drawerProfilesScroll: { flex: 1, minHeight: 0 },
  drawerProfilesScrollContent: { paddingBottom: spacing[2] },
  drawerProfilesScrollHorizontal: { flex: 1, height: "100%" },
  drawerProfilesGridContent: { paddingBottom: spacing[3] },
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
  drawerProfilesFooter: { paddingTop: spacing[4], paddingHorizontal: 0 },
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
});
