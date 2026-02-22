import {
  animation,
  atelier,
  colors,
  radius,
  shadows,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/services/api";
import {
  ApiError,
  chatApi,
  measurementProfilesApi,
  ordersApi,
} from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ITEMS_PER_PAGE = 10;

if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_STATUSES = [
  "pending",
  "accepted",
  "awaiting_payment",
  "paid",
  "in_progress",
  "quality_check",
  "ready",
  "pending_acceptance",
  "invoice_sent",
  "in_production",
  "ready_for_delivery",
];
const COMPLETED_STATUSES = ["completed", "delivered"];
const CANCELLED_STATUSES = ["cancelled", "rejected", "refunded"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  awaiting_payment: "Awaiting Payment",
  pending_acceptance: "Pending",
  accepted: "Accepted",
  paid: "Paid",
  in_progress: "In Progress",
  quality_check: "Quality Check",
  ready: "Ready",
  ready_for_delivery: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  refunded: "Refunded",
};

function getOrderTotalValue(order: Order): number {
  const t = order.total;
  if (t && typeof t === "object" && "value" in t)
    return (t as { value: number }).value;
  return 0;
}

function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SortOption = "newest" | "oldest" | "price_high" | "price_low";

interface OrderCardProps {
  order: Order;
  isDraft: boolean;
  onView: () => void;
  onContinue?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onContact: () => void;
  onCancel?: () => void;
  onPayHolding?: () => void;
  onEdit?: () => void;
}

function OrderCard({
  order,
  isDraft,
  onView,
  onContinue,
  onDelete,
  onDuplicate,
  onContact,
  onCancel,
  onPayHolding,
  onEdit,
}: OrderCardProps) {
  const preview = order.meta?.outfit_preview;
  const name = order.meta?.outfit_name || "Custom Order";
  const statusLabel =
    STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ");
  const isDraftStatus = order.status === "draft";

  return (
    <Pressable
      onPress={onView}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardThumb}>
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <FontAwesome name="image" size={28} color={atelier.muted} />
          </View>
        )}
        {isDraftStatus && <View style={styles.cardThumbAccent} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={[styles.badge, isDraftStatus && styles.badgeDraft]}>
            <Text
              style={[styles.badgeText, isDraftStatus && styles.badgeTextDraft]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.cardMetaText}>
          {order.organization?.business_name ?? "—"}
        </Text>
        <Text style={styles.cardMetaText}>
          {formatRelativeDate(order.created_at)}
        </Text>
        <View style={styles.cardActions}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onView();
            }}
            style={({ pressed }) => [
              styles.cardActionBtn,
              pressed && styles.cardActionPressed,
            ]}
          >
            <Text style={styles.cardActionLabel}>View</Text>
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onContact();
            }}
            style={({ pressed }) => [
              styles.cardActionBtn,
              pressed && styles.cardActionPressed,
            ]}
          >
            <Text style={styles.cardActionLabel}>Contact</Text>
          </Pressable>
          {isDraftStatus && onDelete && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={({ pressed }) => [
                styles.cardActionBtn,
                pressed && styles.cardActionPressed,
              ]}
            >
              <Text style={styles.cardActionLabelDestructive}>Remove</Text>
            </Pressable>
          )}
          {!isDraftStatus &&
            ACTIVE_STATUSES.includes(order.status) &&
            onCancel && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  pressed && styles.cardActionPressed,
                ]}
              >
                <Text style={styles.cardActionLabelDestructive}>Cancel</Text>
              </Pressable>
            )}
        </View>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measurementProfiles, setMeasurementProfiles] = useState<
    { id: number }[]
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [showNoProfileModal, setShowNoProfileModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "draft" | "active" | "completed" | "cancelled"
  >("all");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const getFilterCount = useCallback(
    (filterValue: string): number => {
      if (filterValue === "all") return orders.length;
      if (filterValue === "draft")
        return orders.filter((o) => o.status === "draft").length;
      if (filterValue === "active")
        return orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
      if (filterValue === "completed")
        return orders.filter((o) => COMPLETED_STATUSES.includes(o.status))
          .length;
      if (filterValue === "cancelled")
        return orders.filter((o) => CANCELLED_STATUSES.includes(o.status))
          .length;
      return 0;
    },
    [orders],
  );

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await ordersApi.getList({ per_page: 100 });
        // if (__DEV__)
        //   console.debug("[Orders] getList response:", JSON.stringify(res));
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : raw &&
              typeof raw === "object" &&
              "data" in raw &&
              Array.isArray((raw as { data: Order[] }).data)
            ? (raw as { data: Order[] }).data
            : [];
        setOrders(list);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setOrders([]);
          setError("Please log in to see your orders.");
        } else {
          setError(
            e instanceof ApiError ? e.message : "Failed to load orders.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated],
  );

  const fetchProfiles = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingProfiles(true);
    try {
      const res = await measurementProfilesApi.getList();
      setMeasurementProfiles(res.data ?? []);
    } catch {
      setMeasurementProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (selectedFilter !== "all") {
      list = list.filter((o) => {
        if (selectedFilter === "draft") return o.status === "draft";
        if (selectedFilter === "active")
          return ACTIVE_STATUSES.includes(o.status);
        if (selectedFilter === "completed")
          return COMPLETED_STATUSES.includes(o.status);
        if (selectedFilter === "cancelled")
          return CANCELLED_STATUSES.includes(o.status);
        return true;
      });
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "price_high":
          return getOrderTotalValue(b) - getOrderTotalValue(a);
        case "price_low":
          return getOrderTotalValue(a) - getOrderTotalValue(b);
        default:
          return 0;
      }
    });
    return list;
  }, [orders, selectedFilter, sortBy]);

  const nonDraftOrders = useMemo(
    () => filteredOrders.filter((o) => o.status !== "draft"),
    [filteredOrders],
  );
  const displayedOrders = useMemo(
    () =>
      selectedFilter === "all"
        ? nonDraftOrders
        : filteredOrders.filter(
            (o) => o.status !== "draft" || selectedFilter === "draft",
          ),
    [selectedFilter, nonDraftOrders, filteredOrders],
  );
  const visibleOrders = useMemo(
    () => displayedOrders.slice(0, displayCount),
    [displayedOrders, displayCount],
  );
  const hasMore = displayCount < displayedOrders.length;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        animation.normal,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setTimeout(() => {
      setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
      setLoadingMore(false);
    }, animation.normal);
  }, [hasMore, loadingMore]);

  const handleStartOrder = useCallback(() => {
    if (measurementProfiles.length === 0) {
      setShowNoProfileModal(true);
      return;
    }
    router.push("/(tabs)");
  }, [measurementProfiles.length, router]);

  const goToMeasurements = useCallback(() => {
    setShowNoProfileModal(false);
    router.push("/(tabs)/account");
  }, [router]);

  const handleDuplicateOrder = useCallback(
    (order: Order) => {
      router.push("/(tabs)/add");
    },
    [router],
  );

  const handleViewOrder = useCallback(
    (order: Order) => {
      router.push(`/order/${order.reference}`);
    },
    [router],
  );

  const handleContactTailor = useCallback(
    async (order: Order) => {
      try {
        const res = await chatApi.listConversations({
          order_id: order.id,
          per_page: 1,
        });
        const conversation = res.data?.[0];
        if (conversation) {
          router.push(`/chat/${conversation.id}`);
        } else {
          router.push(`/(tabs)/inbox?order=${order.id}` as any);
        }
      } catch {
        router.push(`/(tabs)/inbox?order=${order.id}` as any);
      }
    },
    [router],
  );

  const handleDeleteOrder = useCallback(async (orderId: number) => {
    Alert.alert("Delete draft", "Are you sure you want to delete this draft?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, delete",
        style: "destructive",
        onPress: async () => {
          try {
            const cancelRes = await ordersApi.cancel(orderId);
            if (__DEV__)
              // console.debug(
              //   "[Orders] cancel (delete draft) response:",
              //   JSON.stringify(cancelRes),
              // );
              setOrders((prev) => prev.filter((o) => o.id !== orderId));
          } catch {
            Alert.alert("Error", "Failed to delete draft.");
          }
        },
      },
    ]);
  }, []);

  const handleCancelOrder = useCallback(async (orderId: number) => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const cancelRes = await ordersApi.cancel(orderId);
            // if (__DEV__)
            //   console.debug(
            //     "[Orders] cancel order response:",
            //     JSON.stringify(cancelRes),
            //   );
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId ? { ...o, status: "cancelled" } : o,
              ),
            );
          } catch {
            Alert.alert("Error", "Failed to cancel order.");
          }
        },
      },
    ]);
  }, []);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View
          style={[styles.headerWrap, { paddingTop: insets.top + spacing[4] }]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.heroTitle}>My Orders</Text>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sign in to view your orders.</Text>
        </View>
      </View>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + spacing[4] },
        ]}
      >
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + spacing[4] },
        ]}
      >
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => fetchOrders()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.retryBtnPressed,
          ]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.heroTitle}>My Orders</Text>
        <Pressable
          onPress={handleStartOrder}
          disabled={loadingProfiles}
          style={({ pressed }) => [
            styles.primaryCta,
            (pressed || loadingProfiles) && styles.primaryCtaPressed,
          ]}
        >
          {loadingProfiles ? (
            <ActivityIndicator size="small" color={atelier.ctaText} />
          ) : (
            <FontAwesome name="plus" size={16} color={atelier.ctaText} />
          )}
          <Text style={styles.primaryCtaText}>New order</Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(["all", "draft", "active", "completed", "cancelled"] as const).map(
            (value) => {
              const count = getFilterCount(value);
              const active = selectedFilter === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setSelectedFilter(value);
                    setDisplayCount(ITEMS_PER_PAGE);
                  }}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {value === "all"
                      ? "All"
                      : value === "draft"
                        ? "Drafts"
                        : value === "active"
                          ? "In progress"
                          : value === "completed"
                            ? "Completed"
                            : "Cancelled"}
                    {count > 0 ? ` · ${count}` : ""}
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>
        {filteredOrders.length > 0 && (
          <Text style={styles.showingText}>
            {visibleOrders.length} of {filteredOrders.length}
          </Text>
        )}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortScrollContent}
          >
            {(["newest", "oldest", "price_high", "price_low"] as const).map(
              (opt) => (
                <Pressable
                  key={opt}
                  onPress={() => {
                    setSortBy(opt);
                    setDisplayCount(ITEMS_PER_PAGE);
                  }}
                  style={[
                    styles.sortOption,
                    sortBy === opt && styles.sortOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === opt && styles.sortOptionTextActive,
                    ]}
                  >
                    {opt === "newest"
                      ? "Newest"
                      : opt === "oldest"
                        ? "Oldest"
                        : opt === "price_high"
                          ? "Price ↑"
                          : "Price ↓"}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>
        </View>
      </View>

      {displayedOrders.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Orders</Text>
        </View>
      )}
    </>
  );

  const renderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      isDraft={item.status === "draft"}
      onView={() => handleViewOrder(item)}
      onContinue={
        item.status === "draft" ? () => router.push("/(tabs)/add") : undefined
      }
      onDelete={
        item.status === "draft" ? () => handleDeleteOrder(item.id) : undefined
      }
      onDuplicate={
        item.status === "draft" ? () => handleDuplicateOrder(item) : undefined
      }
      onContact={() => handleContactTailor(item)}
      onCancel={
        ACTIVE_STATUSES.includes(item.status)
          ? () => handleCancelOrder(item.id)
          : undefined
      }
      onPayHolding={
        item.status === "draft" ? () => handleViewOrder(item) : undefined
      }
      onEdit={() => handleViewOrder(item)}
    />
  );

  const emptyList =
    visibleOrders.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>
          {filteredOrders.length === 0
            ? "Curated tailoring."
            : "No orders in this filter."}
        </Text>
        <Text style={styles.emptySubtext}>
          {filteredOrders.length === 0
            ? "Begin a commission when you’re ready."
            : "Try another filter or sort."}
        </Text>
        {filteredOrders.length === 0 && (
          <Pressable
            onPress={handleStartOrder}
            disabled={loadingProfiles}
            style={({ pressed }) => [
              styles.primaryCta,
              styles.primaryCtaWide,
              (pressed || loadingProfiles) && styles.primaryCtaPressed,
            ]}
          >
            {loadingProfiles ? (
              <ActivityIndicator size="small" color={atelier.ctaText} />
            ) : (
              <FontAwesome name="plus" size={16} color={atelier.ctaText} />
            )}
            <Text style={styles.primaryCtaText}>New order</Text>
          </Pressable>
        )}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.reference}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={[styles.headerWrap, { paddingTop: insets.top + spacing[4] }]}
          >
            {listHeader}
          </View>
        }
        ListEmptyComponent={emptyList}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreWrap}>
              <Pressable
                onPress={loadMore}
                disabled={loadingMore}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  (pressed || loadingMore) && styles.loadMoreBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Load more orders"
              >
                {loadingMore ? (
                  <ActivityIndicator
                    size="small"
                    color={atelier.ctaText}
                    style={styles.loadMoreSpinner}
                  />
                ) : (
                  <FontAwesome
                    name="chevron-down"
                    size={16}
                    color={atelier.ctaText}
                  />
                )}
                <Text style={styles.loadMoreText}>
                  {loadingMore ? "Loading…" : "Load more"}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          visibleOrders.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchOrders(true);
              fetchProfiles();
              setDisplayCount(ITEMS_PER_PAGE);
            }}
            tintColor={atelier.accent}
          />
        }
      />

      <Modal
        visible={showNoProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Measurements required</Text>
            <Text style={styles.modalBody}>
              Add a measurement profile so your commission can be made to fit.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowNoProfileModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnSecondary,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={goToMeasurements}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  pressed && styles.modalBtnPressed,
                ]}
              >
                <Text style={styles.modalBtnPrimaryText}>Add profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
    paddingHorizontal: spacing[6],
  },
  centered: { justifyContent: "center", alignItems: "center" },
  headerWrap: {
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
  },
  heroTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    minHeight: 48,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: atelier.accent,
    borderRadius: radius.xl,
    ...shadows.soft,
  },
  primaryCtaWide: {
    alignSelf: "stretch",
    marginTop: spacing[4],
  },
  primaryCtaPressed: { opacity: 0.97 },
  primaryCtaText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.sans,
  },
  toolbar: { marginBottom: spacing[6] },
  filterScroll: {
    flexDirection: "row",
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  filterPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: atelier.divider,
  },
  filterPillActive: {
    borderColor: atelier.accent,
    backgroundColor: atelier.panelGlow,
  },
  filterPillText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  filterPillTextActive: { color: atelier.accent },
  showingText: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    marginTop: spacing[2],
  },
  sortScrollContent: {
    flexDirection: "row",
    gap: spacing[2],
  },
  sortLabel: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  sortOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
  },
  sortOptionActive: {},
  sortOptionText: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  sortOptionTextActive: { color: atelier.cta },
  sectionHeader: { marginBottom: spacing[4] },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing[4],
  },
  listContent: { paddingBottom: spacing[16] },
  listContentEmpty: { flexGrow: 1 },
  card: {
    flexDirection: "row",
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    padding: spacing[4],
    marginBottom: spacing[4],
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    ...shadows.soft,
  },
  cardPressed: { opacity: 0.97 },
  cardThumb: {
    width: 80,
    height: 100,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: atelier.backgroundOverlay,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardThumbAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: atelier.accent,
  },
  cardBody: { flex: 1, marginLeft: spacing[4] },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: atelier.divider,
  },
  badgeDraft: { borderColor: atelier.accent },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  badgeTextDraft: { color: atelier.accent },
  cardMetaText: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[4],
    marginTop: spacing[4],
  },
  cardActionBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  cardActionPressed: { opacity: 0.8 },
  cardActionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  cardActionLabelSecondary: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  cardActionLabelDestructive: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.danger[500],
    fontFamily: typography.fontFamily.sans,
  },
  loadingText: {
    marginTop: spacing[6],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    textAlign: "center",
    fontFamily: typography.fontFamily.sans,
  },
  retryBtn: {
    marginTop: spacing[8],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderWidth: 1,
    borderColor: atelier.divider,
    borderRadius: radius.xl,
  },
  retryBtnPressed: { opacity: 0.97 },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  empty: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[4],
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[6],
    textAlign: "center",
  },
  loadMoreWrap: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    alignItems: "center",
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    minHeight: 48,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.xl,
    backgroundColor: atelier.accent,
    ...shadows.soft,
  },
  loadMoreBtnPressed: { opacity: 0.9 },
  loadMoreSpinner: { marginRight: spacing[2] },
  loadMoreText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: atelier.backgroundOverlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  modalContent: {
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    padding: spacing[8],
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  modalBody: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing[4],
    justifyContent: "flex-end",
  },
  modalBtn: {
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.xl,
    justifyContent: "center",
  },
  modalBtnPressed: { opacity: 0.97 },
  modalBtnSecondary: {
    borderWidth: 1,
    borderColor: atelier.divider,
  },
  modalBtnSecondaryText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  modalBtnPrimary: { backgroundColor: atelier.accent },
  modalBtnPrimaryText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.ctaText,
    fontFamily: typography.fontFamily.sans,
  },
});
