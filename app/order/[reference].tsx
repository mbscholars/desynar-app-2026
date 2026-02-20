import { PageHeader } from "@/components/PageHeader";
import {
    atelier,
    radius,
    shadows,
    spacing,
    typography,
} from "@/constants/theme";
import type { OrderDetail, OrderTransaction } from "@/services/api";
import { ordersApi } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    UIManager,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Refined client-facing labels (no "pending", "draft", technical jargon)
const STATUS_CLIENT_LABELS: Record<string, string> = {
  pending: "Awaiting Final Confirmation",
  draft: "Design Finalization Stage",
  accepted: "Confirmed",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  in_progress: "In Progress",
  quality_check: "Quality Review",
  ready: "Ready",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  refunded: "Refunded",
};

const STAGE_LABELS: Record<string, string> = {
  draft: "Design Finalization Stage",
  confirmed: "Confirmed",
  in_production: "In Production",
  quality_check: "Quality Review",
  ready: "Ready",
  dispatched: "Dispatched",
};

const TIMELINE_STEPS = [
  {
    key: "holding_fee",
    label: "Holding Fee Paid",
    icon: "check-circle" as const,
  },
  { key: "design", label: "Design Confirmation", icon: "circle" as const },
  {
    key: "measurements",
    label: "Measurement Validation",
    icon: "circle" as const,
  },
  { key: "production", label: "Production", icon: "circle" as const },
  { key: "quality", label: "Quality Review", icon: "circle" as const },
  { key: "dispatch", label: "Dispatch", icon: "circle" as const },
];

function getStatusClientLabel(order: OrderDetail): string {
  if (order.meta?.holding_fee_paid) return "Reservation Secured";
  return STATUS_CLIENT_LABELS[order.status] ?? order.status.replace(/_/g, " ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getHoldingFeeTransaction(order: OrderDetail): OrderTransaction | null {
  const list = order.transactions ?? [];
  const batch = list.find(
    (t) =>
      t.meta?.type === "batch_holding_fee" ||
      t.notes?.toLowerCase().includes("holding"),
  );
  if (batch) return batch;
  return list.length > 0 ? list[0] : null;
}

function getAmountValue(amount: OrderTransaction["amount"]): number {
  if (amount && typeof amount === "object" && "value" in amount)
    return (amount as { value: number }).value;
  return 0;
}

function getCurrencyCode(amount: OrderTransaction["amount"]): string {
  if (amount && typeof amount === "object" && amount.currency?.code)
    return amount.currency.code;
  return "NGN";
}

function parseGenerationConfig(customization: OrderDetail["customizations"]): {
  style?: string;
  overall_fit?: string;
} {
  const first = customization?.[0]?.product?.attribute_data?.generation_config;
  if (!first || typeof first !== "string") return {};
  try {
    const parsed = JSON.parse(first) as {
      photo?: { photography_style?: string };
      overall_fit?: string;
    };
    return {
      style: parsed.photo?.photography_style?.replace(/_/g, " ") ?? undefined,
      overall_fit: parsed.overall_fit ?? undefined,
    };
  } catch {
    return {};
  }
}

function activityDescriptionClientLabel(description: string): string {
  if (
    description.toLowerCase().includes("automatically assigned") ||
    description.toLowerCase().includes("auto assigned")
  ) {
    return "Assigned to Your Atelier";
  }
  return description;
}

export default function OrderDetailScreen() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getByReference(reference);
      const data = res.data;
      if (data?.order) {
        setOrder(data.order);
        setChatId(data.chat?.id ?? data.order.chats?.[0]?.id ?? null);
      } else {
        setOrder(null);
        setChatId(null);
      }
    } catch {
      setError("Failed to load order.");
      setOrder(null);
      setChatId(null);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleBack = () => router.back();

  const handleMessageAtelier = useCallback(() => {
    if (chatId != null) {
      router.push(`/chat/${chatId}`);
    } else {
      router.push(`/(tabs)/inbox?order=${order?.id}` as any);
    }
  }, [chatId, order?.id, router]);

  const handleAddNotes = () => {
    Alert.alert(
      "Add Notes for Your Tailor",
      "You can send design notes or preferences through the message thread with your atelier.",
      [
        { text: "OK" },
        { text: "Message Atelier", onPress: handleMessageAtelier },
      ],
    );
  };

  const toggleActivity = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActivityExpanded((prev) => !prev);
  };

  if (loading && !order) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top }, styles.centered]}
      >
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (error && !order) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top }, styles.centered]}
      >
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>Back to Orders</Text>
        </Pressable>
      </View>
    );
  }

  if (!order) {
    return (
      <View
        style={[styles.container, { paddingTop: insets.top }, styles.centered]}
      >
        <Text style={styles.errorText}>Order not found.</Text>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>Back to Orders</Text>
        </Pressable>
      </View>
    );
  }

  const statusLabel = getStatusClientLabel(order);
  const outfitName = order.meta?.outfit_name ?? "Custom Order";
  const outfitPreview = order.meta?.outfit_preview;
  const atelierName = order.organization?.business_name ?? "Your Atelier";
  const isVerified =
    (order.organization as { verified?: number } | undefined)?.verified === 1;
  const holdingTxn = getHoldingFeeTransaction(order);
  const { style: designStyle, overall_fit: fit } = parseGenerationConfig(
    order.customizations,
  );
  const activities = order.activities ?? [];

  const canPayHolding =
    order.status === "draft" ||
    order.status === "awaiting_payment" ||
    order.status === "pending_payment";

  const handlePayHolding = () => {
    Alert.alert("Pay Holding Fee", "Payment will be handled here.");
  };

  const handleCancel = () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await ordersApi.cancel(order.id);
            Alert.alert("Cancelled", "Order has been cancelled.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch {
            Alert.alert("Error", "Failed to cancel order.");
          }
        },
      },
    ]);
  };

  const canCancel = ["draft", "pending_acceptance", "pending_payment"].includes(
    order.status,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader onBack={handleBack} title="Order details" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1 — Hero Order Summary */}
        <View style={styles.hero}>
          <View style={styles.heroImageWrap}>
            {outfitPreview ? (
              <Image
                source={{ uri: outfitPreview }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <FontAwesome name="image" size={40} color={atelier.muted} />
              </View>
            )}
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.outfitName} numberOfLines={2}>
              {outfitName}
            </Text>
            <Text style={styles.orderRef}>Order {order.reference}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.atelierRow}>
              <Text style={styles.atelierName}>{atelierName}</Text>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <FontAwesome
                    name="check-circle"
                    size={14}
                    color={atelier.accent}
                  />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.createdDate}>
              Created {formatDate(order.created_at)}
            </Text>
          </View>
        </View>

        {/* SECTION 2 — Order Progress Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order progress</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, index) => {
              const isHolding = step.key === "holding_fee";
              const completed = isHolding && order.meta?.holding_fee_paid;
              const isLast = index === TIMELINE_STEPS.length - 1;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        completed && styles.timelineDotDone,
                      ]}
                    >
                      <FontAwesome
                        name={completed ? "check" : step.icon}
                        size={completed ? 12 : 10}
                        color={completed ? atelier.background : atelier.muted}
                      />
                    </View>
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      completed && styles.timelineLabelDone,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION 3 — Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.panel}>
            {holdingTxn ? (
              <>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Holding Fee</Text>
                  <Text style={styles.paymentAmount}>
                    {getCurrencyCode(holdingTxn.amount)}{" "}
                    {getAmountValue(holdingTxn.amount).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.paymentMethod}>
                  Paid via{" "}
                  {holdingTxn.driver === "paystack"
                    ? "Paystack"
                    : holdingTxn.driver}
                </Text>
                <View style={styles.paymentStatusRow}>
                  <FontAwesome
                    name="check-circle"
                    size={16}
                    color={atelier.accent}
                  />
                  <Text style={styles.paymentStatusText}>Successful</Text>
                </View>
                <Text style={styles.paymentNote}>
                  Final invoice will be issued before production.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.paymentLabel}>Holding Fee</Text>
                <Text style={styles.paymentNote}>No payment recorded yet.</Text>
                {canPayHolding && (
                  <Pressable
                    onPress={handlePayHolding}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <FontAwesome
                      name="credit-card"
                      size={18}
                      color={atelier.ctaText}
                    />
                    <Text style={styles.primaryBtnText}>Pay Holding Fee</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>

        {/* SECTION 4 — Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>
          <View style={styles.panel}>
            {order.profiles && order.profiles.length > 0
              ? order.profiles.map((profile) => (
                  <View key={profile.id} style={styles.measurementBlock}>
                    <Text style={styles.measurementProfileName}>
                      {profile.profile_name}
                    </Text>
                    <Text style={styles.measurementMeta}>
                      Unit:{" "}
                      {profile.measurement_snapshot?.profile_unit ??
                        profile.measurement_profile?.unit ??
                        "cm"}
                      {profile.measurement_snapshot?.snapshot_taken_at && (
                        <>
                          {" "}
                          · Snapshot:{" "}
                          {formatDate(
                            profile.measurement_snapshot.snapshot_taken_at,
                          )}
                        </>
                      )}
                    </Text>
                  </View>
                ))
              : null}
            <Text style={styles.measurementSecured}>
              Measurements secured and attached to this order.
            </Text>
          </View>
        </View>

        {/* SECTION 5 — Customization & Design */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Design</Text>
          <View style={styles.panel}>
            <View style={styles.designRow}>
              <Text style={styles.designLabel}>Design type</Text>
              <Text style={styles.designValue}>
                {order.customizations?.[0]?.product?.attribute_data?.type ??
                  "Made-To-Measure"}
              </Text>
            </View>
            <View style={styles.designRow}>
              <Text style={styles.designLabel}>Generated via</Text>
              <Text style={styles.designValue}>
                {order.customizations?.[0]?.product?.attribute_data?.source ===
                "outfit_generator"
                  ? "Outfit Generator"
                  : "Custom"}
              </Text>
            </View>
            {designStyle && (
              <View style={styles.designRow}>
                <Text style={styles.designLabel}>Style</Text>
                <Text style={styles.designValue}>{designStyle}</Text>
              </View>
            )}
            {fit && (
              <View style={styles.designRow}>
                <Text style={styles.designLabel}>Fit</Text>
                <Text style={styles.designValue}>{fit}</Text>
              </View>
            )}
            <Pressable
              onPress={handleAddNotes}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <FontAwesome name="pencil" size={16} color={atelier.accent} />
              <Text style={styles.secondaryBtnText}>
                Add Notes for Your Tailor
              </Text>
            </Pressable>
          </View>
        </View>

        {/* SECTION 6 — Communication Hub */}
        <View style={styles.section}>
          <Pressable
            onPress={handleMessageAtelier}
            style={({ pressed }) => [
              styles.messageCta,
              pressed && styles.btnPressed,
            ]}
          >
            <FontAwesome name="comments" size={22} color={atelier.ctaText} />
            <Text style={styles.messageCtaText}>Message Your Atelier</Text>
            <FontAwesome
              name="chevron-right"
              size={16}
              color={atelier.ctaText}
            />
          </Pressable>
        </View>

        {/* SECTION 7 — Activity Log (collapsible) */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <Pressable onPress={toggleActivity} style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>Activity</Text>
              <FontAwesome
                name={activityExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={atelier.muted}
              />
            </Pressable>
            {activityExpanded && (
              <View style={styles.panel}>
                {activities.map((a) => (
                  <View key={a.id} style={styles.activityItem}>
                    <Text style={styles.activityDesc}>
                      {activityDescriptionClientLabel(a.description)}
                    </Text>
                    <Text style={styles.activityDate}>
                      {formatDate(a.created_at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {canCancel && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.dangerBtnText}>Cancel order</Text>
          </Pressable>
        )}

        <View style={{ height: insets.bottom + spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: spacing[12] },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[4],
  },
  btn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: atelier.accent,
    borderRadius: radius.lg,
  },
  btnPressed: { opacity: 0.9 },
  btnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.sans,
  },

  hero: {
    marginBottom: spacing[6],
  },
  heroImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius["2xl"],
    overflow: "hidden",
    backgroundColor: atelier.panel,
    ...shadows.medium,
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { marginTop: spacing[4] },
  outfitName: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[1],
  },
  orderRef: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  badgeRow: { flexDirection: "row", marginBottom: spacing[2] },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.accent,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  atelierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  atelierName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  verifiedText: {
    fontSize: typography.fontSize.xs,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  createdDate: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },

  section: { marginBottom: spacing[6] },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[3],
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  panel: {
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    padding: spacing[5],
  },
  timeline: {},
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing[1],
  },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: {
    backgroundColor: atelier.accent,
    borderColor: atelier.accent,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: atelier.panelBorder,
    marginTop: 2,
  },
  timelineLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginLeft: spacing[3],
    marginTop: 2,
  },
  timelineLabelDone: {
    color: atelier.accent,
    fontWeight: typography.fontWeight.medium,
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  paymentLabel: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  paymentAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  paymentMethod: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[1],
  },
  paymentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  paymentStatusText: {
    fontSize: typography.fontSize.sm,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  paymentNote: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[2],
  },

  measurementBlock: { marginBottom: spacing[3] },
  measurementProfileName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  measurementMeta: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  measurementSecured: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },

  designRow: {
    marginBottom: spacing[3],
  },
  designLabel: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[1],
  },
  designValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.accent,
    marginTop: spacing[4],
  },
  secondaryBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },

  messageCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    backgroundColor: atelier.accent,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: "rgba(198, 167, 94, 0.3)",
  },
  messageCtaText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.sans,
  },

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  activityItem: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: atelier.divider,
  },
  activityDesc: {
    fontSize: typography.fontSize.sm,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  activityDate: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: atelier.accent,
    borderRadius: radius.xl,
    marginTop: spacing[3],
  },
  primaryBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.sans,
  },
  dangerBtn: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.muted,
    alignItems: "center",
    marginTop: spacing[4],
  },
  dangerBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
});
