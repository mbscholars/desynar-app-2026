import { PageHeader } from "@/components/PageHeader";
import {
  atelier,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types/cart";
import { formatPrice } from "@/utils/format";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Portrait image: width/height = 3/5 so cards are taller (more image visible). */
const CARD_ASPECT = 3 / 5;
const GRID_GAP = spacing[3];
const CTA_BUTTON_HEIGHT = 54;
const MIN_TAP = 44;

/** Display image: accepted customization/try-on or product image. */
function getCartItemImageUri(item: CartItem): string {
  return (
    item.customization?.acceptedCustomizedImageUrl ?? item.product.imageUri
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { items, updateQuantity, removeItem } = useCart();

  const cardWidth = useMemo(() => {
    const horizontalPadding = spacing[6] * 2;
    return (width - horizontalPadding - GRID_GAP) / 2;
  }, [width]);

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  const onProceed = useCallback(() => {
    (router.push as (href: string) => void)("/checkout");
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader onBack={onBack} title="Review" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: CTA_BUTTON_HEIGHT + insets.bottom + spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome name="shopping-cart" size={48} color={atelier.muted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyBody}>
              Add items from the home feed to see them here.
            </Text>
          </View>
        ) : (
          <View style={styles.cartGrid}>
            {items.map((item) => (
              <CartCard
                key={item.lineId}
                item={item}
                cardWidth={cardWidth}
                imageUri={getCartItemImageUri(item)}
                onPress={() => router.push(`/review/${item.lineId}`)}
                onQuantityChange={(q) => updateQuantity(item.lineId, q)}
                onRemove={() => removeItem(item.lineId)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View
          style={[
            styles.ctaWrap,
            {
              paddingBottom: Math.max(insets.bottom, spacing[4]),
              paddingTop: spacing[4],
            },
          ]}
        >
          <Pressable
            onPress={onProceed}
            style={({ pressed }) => [
              styles.ctaButton,
              styles.ctaButtonFull,
              pressed && styles.ctaButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Checkout"
          >
            <Text style={styles.ctaButtonText}>Proceed to Checkout</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CartCard({
  item,
  cardWidth,
  imageUri,
  onPress,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  cardWidth: number;
  imageUri: string;
  onPress: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { product, quantity, selectedProfiles } = item;
  const lineTotal = (product.price ?? 0) * quantity;
  const profileLabel = selectedProfiles?.length
    ? selectedProfiles.map((p) => p.name).join(", ")
    : "—";

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.cardDeleteBtn,
          pressed && styles.cardDeleteBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Remove item"
      >
        <FontAwesome name="trash-o" size={16} color={atelier.cta} />
      </Pressable>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.cardPressablePressed]}
        accessibilityRole="button"
        accessibilityLabel="View item details"
      >
        <View style={styles.cardImageWrap}>
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        </View>
        <View style={styles.cardTextBackdrop}>
          <Text style={styles.cardName} numberOfLines={2}>
            {product.outfitName}
          </Text>
          <Text style={styles.cardProfiles} numberOfLines={1}>
            {profileLabel}
          </Text>
          <Text style={styles.cardPrice}>
            {formatPrice(lineTotal, product.currency)}
          </Text>
        </View>
      </Pressable>
      <View style={styles.cardQuantityWrap}>
        <View style={styles.quantityRow}>
          <Pressable
            onPress={() => onQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            style={({ pressed }) => [
              styles.quantityBtn,
              quantity <= 1 && styles.quantityBtnDisabled,
              pressed && quantity > 1 && styles.quantityBtnPressed,
            ]}
            accessibilityLabel="Decrease quantity"
          >
            <FontAwesome
              name="minus"
              size={14}
              color={quantity <= 1 ? atelier.muted : atelier.cta}
            />
          </Pressable>
          <Text style={styles.quantityText}>{quantity}</Text>
          <Pressable
            onPress={() => onQuantityChange(quantity + 1)}
            style={({ pressed }) => [
              styles.quantityBtn,
              pressed && styles.quantityBtnPressed,
            ]}
            accessibilityLabel="Increase quantity"
          >
            <FontAwesome name="plus" size={14} color={atelier.cta} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing[24],
    gap: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  emptyBody: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
  },
  cartGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  card: {
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    overflow: "hidden",
    ...shadows.soft,
  },
  cardDeleteBtn: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    zIndex: 1,
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDeleteBtnPressed: { opacity: 0.7 },
  cardPressablePressed: { opacity: 0.9 },
  cardImageWrap: {
    aspectRatio: 1 / CARD_ASPECT,
    overflow: "hidden",
    backgroundColor: atelier.backgroundOverlay,
    position: "relative",
  },
  cardTextBackdrop: {
    width: "100%",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: atelier.panel,
    borderTopWidth: 1,
    borderTopColor: atelier.panelBorder,
  },
  cardName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  cardProfiles: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  cardPrice: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginTop: spacing[2],
  },
  cardQuantityWrap: {
    width: "100%",
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: atelier.divider,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityBtnPressed: { opacity: 0.8 },
  quantityText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
    minWidth: 24,
    textAlign: "center",
  },
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: atelier.background,
    paddingHorizontal: spacing[6],
    borderTopWidth: 1,
    borderTopColor: atelier.panelBorder,
  },
  ctaButton: {
    minHeight: CTA_BUTTON_HEIGHT,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: atelier.accent,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.soft,
  },
  ctaButtonFull: { width: "100%" },
  ctaButtonPressed: { opacity: 0.97 },
  ctaButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
});
