import {
  atelier,
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import type { Conversation } from "@/services/api";
import { ApiError, chatApi } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getConversationDisplayName(c: Conversation): string {
  if (c.title) return c.title;
  const others = c.participants?.filter((p) => p.name) ?? [];
  if (others.length >= 1) return others.map((p) => p.name).join(", ");
  return "Conversation";
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setConversations([]);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await chatApi.listConversations({ per_page: 25, enriched: true });
      console.log("[Inbox] chat inbox response", JSON.stringify(res, null, 2));
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: Conversation[] }).data))
          ? (raw as { data: Conversation[] }).data
          : [];
      setConversations(list);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setConversations([]);
        setError("Sign in to view conversations.");
      } else {
        setError(e instanceof ApiError ? e.message : "Failed to load conversations.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onConversationPress = useCallback(
    (id: number) => {
      router.push({ pathname: "/chat/[id]", params: { id: String(id) } } as any);
    },
    [router],
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
          <Text style={styles.title}>Inbox</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sign in to view conversations.</Text>
        </View>
      </View>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + spacing[4] }]}>
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + spacing[4] }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => fetchConversations()} style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Conversation }) => {
    const name = getConversationDisplayName(item);
    const lastBody = item.last_message?.body ?? "";
    const time = item.last_message?.created_at ? formatMessageTime(item.last_message.created_at) : "";
    const unread = item.unread_count ?? 0;

    return (
      <Pressable
        onPress={() => onConversationPress(item.id)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.avatar}>
          <FontAwesome name="user" size={20} color={atelier.muted} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
            {time ? <Text style={styles.rowTime}>{time}</Text> : null}
          </View>
          {lastBody ? (
            <Text style={[styles.rowPreview, unread > 0 && styles.rowPreviewUnread]} numberOfLines={1}>
              {lastBody}
            </Text>
          ) : null}
        </View>
        {unread > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[4] }]}>
        <Text style={styles.title}>Inbox</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, conversations.length === 0 && styles.listContentEmpty]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="comments-o" size={40} color={atelier.muted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>When you have a chat with a tailor or support, it will appear here.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchConversations(true)}
            tintColor={atelier.accent}
            colors={[atelier.accent]}
          />
        }
      />
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
  header: {
    paddingBottom: spacing[4],
    paddingHorizontal: 0,
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[6],
  },
  listContent: { paddingBottom: spacing[16] },
  listContentEmpty: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: atelier.divider,
  },
  rowPressed: { opacity: 0.97 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[4],
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing[1] },
  rowTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    flex: 1,
  },
  rowTime: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginLeft: spacing[2],
  },
  rowPreview: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  rowPreviewUnread: { color: atelier.cta, fontWeight: typography.fontWeight.medium },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: atelier.accent,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing[2],
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.ctaText,
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
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
  },
});
