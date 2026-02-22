import {
  atelier,
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { notificationsApi } from "@/services/api";
import type { NotificationApiItem } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BODY_TRUNCATE_LENGTH = 120;

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  /** Display time, e.g. "2 min ago" or "Yesterday" */
  time: string;
  /** Optional subtitle or type, e.g. "Order" or "Promo" */
  subtitle?: string;
  /** Optional route to open when the notification is tapped */
  route?: string;
  /** Optional unread state */
  unread?: boolean;
};

/** Format ISO 8601 created_at to relative display string. */
function formatRelativeTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function apiToNotificationItem(raw: NotificationApiItem): NotificationItem {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    time: formatRelativeTime(raw.created_at),
    subtitle: raw.subtitle,
    route: raw.route,
    unread: raw.unread,
  };
}

function NotificationRow({
  item,
  expanded,
  onToggleExpand,
  onPress,
}: {
  item: NotificationItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onPress: () => void;
}) {
  const isLong = item.body.length > BODY_TRUNCATE_LENGTH;
  const displayBody = isLong && !expanded
    ? item.body.slice(0, BODY_TRUNCATE_LENGTH).trim() + "..."
    : item.body;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        item.unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.rowContent}>
        {item.subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={expanded ? undefined : 4}>
          {displayBody}
        </Text>
        {isLong && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.readMoreWrap, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.readMoreText}>
              {expanded ? "Show less" : "Read more"}
            </Text>
            <FontAwesome
              name={expanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={atelier.accent}
              style={styles.readMoreIcon}
            />
          </Pressable>
        )}
        <Text style={styles.time}>{item.time}</Text>
      </View>
      {item.route && (
        <FontAwesome
          name="chevron-right"
          size={14}
          color={atelier.muted}
          style={styles.chevron}
        />
      )}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setError(null);
    try {
      const list = await notificationsApi.getList({ limit: 50 });
      setNotifications(list.map(apiToNotificationItem));
    } catch {
      setError("Could not load notifications.");
      setNotifications((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearAll = useCallback(async () => {
    if (notifications.length === 0) return;
    setClearing(true);
    try {
      await notificationsApi.deleteAll();
      setNotifications([]);
    } catch {
      setError("Could not clear notifications.");
    } finally {
      setClearing(false);
    }
  }, [notifications.length]);

  const handleNotificationPress = useCallback(
    async (item: NotificationItem) => {
      if (item.unread) {
        try {
          await notificationsApi.markRead(item.id);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === item.id ? { ...n, unread: false } : n,
            ),
          );
        } catch {
          // ignore
        }
      }
      if (item.route) {
        router.push(item.route as any);
      }
    },
    [router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable
          onPress={handleClearAll}
          disabled={notifications.length === 0 || clearing}
          style={({ pressed }) => [
            styles.clearBtn,
            (pressed || notifications.length === 0 || clearing) &&
              styles.clearBtnDisabled,
          ]}
          accessibilityLabel="Clear all notifications"
        >
          {clearing ? (
            <ActivityIndicator size="small" color={atelier.accent} />
          ) : (
            <Text
              style={[
                styles.clearBtnText,
                notifications.length === 0 && styles.clearBtnTextDisabled,
              ]}
            >
              Clear all
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={atelier.accent} />
            <Text style={styles.emptySubtext}>Loading…</Text>
          </View>
        ) : error && notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{error}</Text>
            <Text style={styles.emptySubtext}>
              Pull down or reopen this screen to retry.
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome
              name="bell-slash-o"
              size={48}
              color={atelier.muted}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              When you get notifications, they’ll show up here.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              expanded={expandedIds.has(item.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              onPress={() => handleNotificationPress(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  pressed: { opacity: 0.8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: atelier.divider,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    textAlign: "center",
  },
  clearBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minWidth: 72,
    alignItems: "flex-end",
  },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.accent,
  },
  clearBtnTextDisabled: {
    color: atelier.muted,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: atelier.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: atelier.accent,
    paddingLeft: spacing[3] - 3,
  },
  rowPressed: { opacity: 0.9 },
  rowContent: { flex: 1, minWidth: 0 },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: atelier.accent,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginBottom: spacing[1],
  },
  body: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  readMoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: spacing[2],
  },
  readMoreText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.accent,
  },
  readMoreIcon: {
    marginLeft: 4,
  },
  time: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
  chevron: {
    marginLeft: spacing[2],
    marginTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    marginBottom: spacing[4],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginBottom: spacing[2],
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    textAlign: "center",
  },
});
