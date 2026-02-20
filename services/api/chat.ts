/**
 * Chat API — conversations, messages, read state.
 * Matches Desynar Chat API (Postman / api/v1/chats).
 * Auth: Bearer token via client.
 *
 * Real-time: no Pusher/WebSockets. Use REST + polling when the chat screen is open.
 * Push notifications: FCM (see docs/ChatAndPush.md).
 */

import { api } from "./client";

// ---------------------------------------------------------------------------
// Types (aligned with Postman & desynar/src/services/api/chat.ts)
// ---------------------------------------------------------------------------

export type ParticipantType =
  | "user"
  | "tailor"
  | "admin"
  | "organization"
  | "dealer"
  | "rider";

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "location";

export interface Participant {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  type: ParticipantType;
  avatar_url?: string;
}

export interface MessageSender {
  id: number;
  name: string;
  type: ParticipantType;
  avatar_url?: string;
}

export interface MessageData {
  file_url: string;
  file_name: string;
  file_path?: string;
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  duration?: number;
  is_voice_note?: boolean;
}

export interface ReplyTo {
  id: number;
  body: string;
  preview: string;
  sender: MessageSender;
}

export interface Message {
  id: number;
  body: string;
  type: MessageType;
  conversation_id: number;
  reply_to_id: number | null;
  reply_to?: ReplyTo;
  data?: MessageData | null;
  sender: MessageSender;
  is_flagged?: boolean;
  is_read?: boolean;
  created_at: string;
}

export interface LastMessage {
  id: number;
  body: string;
  type: MessageType;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  description?: string;
  private: boolean;
  direct_message?: boolean;
  order_id?: number;
  participants: Participant[];
  unread_count: number;
  last_message?: LastMessage | null;
  created_at: string;
  updated_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ListConversationsResponse {
  data: Conversation[];
  meta: PaginationMeta;
}

export interface GetConversationResponse {
  data: Conversation;
}

export interface ListMessagesResponse {
  data: Message[];
  meta: PaginationMeta;
}

export interface SendMessageResponse {
  message: string;
  data: Message;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface ListConversationsParams {
  per_page?: number;
  enriched?: boolean;
  page?: number;
  order_id?: number;
}

export interface ListMessagesParams {
  per_page?: number;
  page?: number;
}

export interface SendTextMessageBody {
  body: string;
  type: "text";
  reply_to_id?: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const BASE = "/api/v1/chats";

export const chatApi = {
  /** List conversations for the authenticated user (enriched with participants, unread, last_message). */
  listConversations(
    params?: ListConversationsParams,
  ): Promise<ListConversationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.per_page != null)
      searchParams.set("per_page", String(params.per_page));
    if (params?.enriched != null)
      searchParams.set("enriched", String(params.enriched));
    if (params?.page != null) searchParams.set("page", String(params.page));
    if (params?.order_id != null)
      searchParams.set("order_id", String(params.order_id));
    const query = searchParams.toString();
    const url = query ? `${BASE}?${query}` : BASE;
    return api.get<ListConversationsResponse>(url, { requiresAuth: true });
  },

  getConversation(conversationId: number): Promise<GetConversationResponse> {
    return api.get<GetConversationResponse>(`${BASE}/${conversationId}`, {
      requiresAuth: true,
    });
  },

  getUnreadCount(): Promise<UnreadCountResponse> {
    return api.get<UnreadCountResponse>(`${BASE}/unread-count`, {
      requiresAuth: true,
    });
  },

  listMessages(
    conversationId: number,
    params?: ListMessagesParams,
  ): Promise<ListMessagesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.per_page != null)
      searchParams.set("per_page", String(params.per_page));
    if (params?.page != null) searchParams.set("page", String(params.page));
    const query = searchParams.toString();
    const url = query
      ? `${BASE}/${conversationId}/messages?${query}`
      : `${BASE}/${conversationId}/messages`;
    return api.get<ListMessagesResponse>(url, { requiresAuth: true });
  },

  sendMessage(
    conversationId: number,
    body: SendTextMessageBody,
  ): Promise<SendMessageResponse> {
    return api.post<SendMessageResponse>(
      `${BASE}/${conversationId}/messages`,
      body,
      {
        requiresAuth: true,
      },
    );
  },

  markAllMessagesAsRead(conversationId: number): Promise<MarkReadResponse> {
    return api.post<MarkReadResponse>(
      `${BASE}/${conversationId}/read-all`,
      undefined,
      {
        requiresAuth: true,
      },
    );
  },

  replyToMessage(
    messageId: number,
    body: { body: string; type: "text" },
  ): Promise<SendMessageResponse> {
    return api.post<SendMessageResponse>(
      `${BASE}/messages/${messageId}/reply`,
      body,
      {
        requiresAuth: true,
      },
    );
  },

  markMessageAsRead(messageId: number): Promise<MarkReadResponse> {
    return api.post<MarkReadResponse>(
      `${BASE}/messages/${messageId}/read`,
      undefined,
      {
        requiresAuth: true,
      },
    );
  },
};
