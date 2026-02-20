import { PageHeader } from "@/components/PageHeader";
import { atelier, radius, spacing, typography } from "@/constants/theme";
import type { Conversation, Message } from "@/services/api";
import { chatApi } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getConversationTitle(c: Conversation | null): string {
  if (!c) return "Chat";
  if (c.title) return c.title;
  const others = c.participants?.filter((p) => p.name) ?? [];
  if (others.length >= 1) return others.map((p) => p.name).join(", ");
  return "Chat";
}

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const conversationId = id ? parseInt(id, 10) : NaN;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationId || isNaN(conversationId)) return;
    try {
      const res = await chatApi.getConversation(conversationId);
      setConversation(res.data ?? null);
    } catch {
      setConversation(null);
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || isNaN(conversationId)) return;
    try {
      const res = await chatApi.listMessages(conversationId, { per_page: 50 });
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : raw &&
            typeof raw === "object" &&
            "data" in raw &&
            Array.isArray((raw as { data: Message[] }).data)
          ? (raw as { data: Message[] }).data
          : [];
      setMessages(list);
    } catch {
      setMessages([]);
    }
  }, [conversationId]);

  const load = useCallback(async () => {
    if (!conversationId || isNaN(conversationId)) return;
    setLoading(true);
    try {
      await Promise.all([fetchConversation(), fetchMessages()]);
      await chatApi.markAllMessagesAsRead(conversationId);
    } finally {
      setLoading(false);
    }
  }, [conversationId, fetchConversation, fetchMessages]);

  useEffect(() => {
    load();
  }, [load]);

  const sendMessage = useCallback(async () => {
    const body = inputText.trim();
    if (!body || !conversationId || isNaN(conversationId) || sending) return;
    setSending(true);
    setInputText("");
    try {
      const res = await chatApi.sendMessage(conversationId, {
        body,
        type: "text",
      });
      setMessages((prev) => [res.data, ...prev]);
    } catch {
      setInputText(body);
    } finally {
      setSending(false);
    }
  }, [inputText, conversationId, sending]);

  const handleBack = useCallback(() => router.back(), [router]);

  if (!id || isNaN(conversationId)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Invalid conversation.</Text>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const title = getConversationTitle(conversation);

  const renderMessage = ({ item }: { item: Message }) => {
    const isText = item.type === "text";
    const body = isText ? item.body : item.body || `[${item.type}]`;
    return (
      <View style={styles.messageBubble}>
        {item.sender?.name ? (
          <Text style={styles.messageSender}>{item.sender.name}</Text>
        ) : null}
        <Text style={styles.messageBody}>{body}</Text>
        <Text style={styles.messageTime}>
          {formatMessageTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <PageHeader onBack={handleBack} title={title} showBackLabel />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No messages yet. Send one below.
            </Text>
          </View>
        }
      />

      <View
        style={[styles.inputRow, { paddingBottom: insets.bottom + spacing[2] }]}
      >
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={atelier.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!inputText.trim() || sending) && styles.sendBtnDisabled,
            pressed && !sending && styles.sendBtnPressed,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={atelier.ctaText} />
          ) : (
            <FontAwesome name="send" size={18} color={atelier.ctaText} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  messageList: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    flexGrow: 1,
  },
  messageBubble: {
    marginBottom: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    maxWidth: "85%",
  },
  messageSender: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[1],
  },
  messageBody: {
    fontSize: typography.fontSize.sm,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  empty: {
    paddingVertical: spacing[8],
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: atelier.divider,
    backgroundColor: atelier.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    backgroundColor: atelier.panel,
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: atelier.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnPressed: { opacity: 0.97 },
  loadingText: {
    marginTop: spacing[6],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
});
