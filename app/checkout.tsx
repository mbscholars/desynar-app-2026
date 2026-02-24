import { PageHeader } from "@/components/PageHeader";
import {
    atelier,
    radius,
    shadows,
    spacing,
    typography,
} from "@/constants/theme";
import { useCart } from "@/context/CartContext";
import type {
    CreateBatchOrderItem,
    CreateBatchOrderRequest,
} from "@/services/api/orders";
import { ordersApi } from "@/services/api/orders";
import type { CartItem } from "@/types/cart";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getCartItemImageUri(item: CartItem): string {
  return (
    item.customization?.acceptedCustomizedImageUrl ?? item.product.imageUri
  );
}

type CheckoutPhase = "summary" | "creating" | "success" | "failed";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, clearCart } = useCart();

  const [phase, setPhase] = useState<CheckoutPhase>("summary");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderReference, setOrderReference] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<
    { id: number; reference: string }[]
  >([]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const onBack = useCallback(() => {
    if (phase === "summary" || phase === "failed") router.back();
    else if (phase === "success") router.replace("/(tabs)/orders");
    else setPhase("summary");
  }, [phase, router]);

  const buildPayload = useCallback((): CreateBatchOrderRequest => {
    const mapSource = (s: string | undefined): "upload" | "store" | "ai" => {
      if (s === "catalog" || s === "store") return "store";
      if (s === "ai") return "ai";
      return "upload";
    };
    const orderItems: CreateBatchOrderItem[] = items.map((item) => {
      const profileIds = (item.selectedProfiles ?? [])
        .map((p) => Number(p.id))
        .filter((n) => !Number.isNaN(n));
      const firstId = profileIds[0];
      return {
        product_id: item.product.id,
        organization_id: 1,
        outfit_name: item.product.outfitName,
        outfit_source: mapSource(
          (item.product as { outfit_source?: string })?.outfit_source,
        ),
        outfit_preview:
          item.customization?.acceptedCustomizedImageUrl ??
          item.product.imageUri,
        customizations: {
          voice_note_url: item.customization?.voiceNoteUrl ?? null,
          voice_transcript: item.customization?.voiceTranscript ?? null,
          text_instructions: item.customization?.textInstructions ?? null,
          ai_revisions:
            item.customization?.aiRevisions?.map((r) => ({
              preview: r.preview,
              prompt: r.prompt,
              uploadedUrl: r.uploadedUrl,
              isAccepted: r.isAccepted,
            })) ?? [],
          accepted_customized_image_url:
            item.customization?.acceptedCustomizedImageUrl ?? null,
        },
        profiles:
          firstId != null
            ? [
                {
                  measurement_profile_id: firstId,
                  quantity: item.quantity,
                },
              ]
            : [],
      };
    });
    return {
      payment_method: "paystack",
      items: orderItems,
    };
  }, [items]);

  const handlePlaceOrder = useCallback(async () => {
    const payload = buildPayload();
    if (payload.items.length === 0) {
      setPhase("failed");
      setErrorMessage(
        "No valid items to order. Add items and ensure each has a measurement profile.",
      );
      return;
    }
    setPhase("creating");
    setErrorMessage(null);
    try {
      const res = await ordersApi.createBatch(payload);
      if (!res.success || !res.data) {
        setPhase("failed");
        setErrorMessage(res.message ?? "Failed to create order");
        return;
      }
      const { orders } = res.data;
      setOrderReference(orders[0]?.reference ?? null);
      setCreatedOrders(
        orders.map((o) => ({ id: o.id, reference: o.reference })),
      );
      clearCart();
      setPhase("success");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to create order. Please try again.";
      setPhase("failed");
      setErrorMessage(msg);
    }
  }, [buildPayload, clearCart]);

  if (items.length === 0 && phase === "summary") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <PageHeader onBack={() => router.back()} title="Checkout" />
        <View style={styles.empty}>
          <FontAwesome name="shopping-cart" size={48} color={atelier.muted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyBody}>
            Add items from the home feed, then return to checkout.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Back to Review</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "success") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <PageHeader onBack={onBack} title="Order placed" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.successContent,
            { paddingBottom: insets.bottom + spacing[8] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconWrap}>
            <FontAwesome name="check-circle" size={72} color={atelier.accent} />
          </View>
          <Text style={styles.successTitle}>Order received</Text>
          <Text style={styles.successSubtitle}>
            We’re working on this and expect a follow-up within 24 working hours.
          </Text>
          <Text style={styles.successBody}>
            Our team will reach out with next steps. You can track this order in
            "My orders" anytime.
          </Text>
{orderReference ? (
            <Text style={styles.orderRef}>Order {orderReference}</Text>
          ) : null}
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>View my orders</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader
        onBack={onBack}
        title={phase === "failed" ? "Order issue" : "Checkout"}
      />

      {phase === "creating" && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={atelier.accent} />
          <Text style={styles.overlayText}>Creating order…</Text>
        </View>
      )}

      {phase === "failed" && (
        <View style={styles.errorBanner}>
          <FontAwesome
            name="exclamation-circle"
            size={24}
            color={atelier.cta}
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <View style={styles.errorActions}>
            <Pressable
              onPress={() => {
                setPhase("summary");
                setErrorMessage(null);
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>
            <Pressable
              onPress={() => setPhase("summary")}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>Back to summary</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + spacing[8] },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {(phase === "summary" || phase === "failed") && (
              <>
                <Text style={styles.sectionTitle}>Order summary</Text>
                <View style={styles.itemList}>
                  {items.map((item) => (
                    <View key={item.lineId} style={styles.itemRow}>
                      <Image
                        source={{ uri: getCartItemImageUri(item) }}
                        style={styles.itemImage}
                      />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.product.outfitName}
                        </Text>
                        <Text style={styles.itemMeta}>
                          {item.quantity} item(s)
                          {item.selectedProfiles?.length
                            ? ` · ${item.selectedProfiles.map((p) => p.name).join(", ")}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.summaryBlock}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total designs</Text>
                    <Text style={styles.summaryValue}>{items.length}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total items</Text>
                    <Text style={styles.summaryValue}>{totalItems}</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

      {phase === "summary" && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing[4]),
              paddingTop: spacing[4],
            },
          ]}
        >
          <Pressable
            onPress={handlePlaceOrder}
            disabled={phase === "creating"}
            style={({ pressed }) => [
              styles.primaryBtn,
              styles.primaryBtnFull,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Place order</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginTop: spacing[4],
  },
  emptyBody: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    marginTop: spacing[2],
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginBottom: spacing[4],
  },
  itemList: { gap: spacing[3] },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    padding: spacing[3],
    ...shadows.soft,
  },
  itemImage: {
    width: 56,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: atelier.backgroundOverlay,
  },
  itemInfo: { flex: 1, marginLeft: spacing[3], minWidth: 0 },
  itemName: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  itemMeta: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    marginTop: spacing[1],
  },
  summaryBlock: {
    marginTop: spacing[6],
    backgroundColor: atelier.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    padding: spacing[4],
    ...shadows.soft,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  summaryLabel: { fontSize: typography.fontSize.sm, color: atelier.muted },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  footer: {
    backgroundColor: atelier.background,
    borderTopWidth: 1,
    borderTopColor: atelier.panelBorder,
    paddingHorizontal: spacing[6],
  },
  primaryBtn: {
    minHeight: 54,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    backgroundColor: atelier.accent,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.soft,
  },
  primaryBtnFull: { width: "100%" },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnFull: { width: "100%", marginTop: spacing[3] },
  secondaryBtnPressed: { opacity: 0.8 },
  secondaryBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: atelier.backgroundOverlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.cta,
  },
  errorBanner: {
    margin: spacing[4],
    padding: spacing[4],
    backgroundColor: atelier.panel,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.divider,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: atelier.cta,
    marginTop: spacing[2],
  },
  errorActions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[4],
  },
  successContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    alignItems: "center",
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: atelier.panel,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  successTitle: {
    fontSize: typography.fontSize["3xl"],
    fontFamily: typography.fontFamily.bold,
    color: atelier.cta,
    marginBottom: spacing[2],
  },
  successSubtitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  successBody: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  orderRef: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    marginBottom: spacing[6],
  },
});
