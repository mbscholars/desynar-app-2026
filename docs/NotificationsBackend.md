# Notifications — backend guide

This document describes the API contract for the **Notifications** screen in the mobile app. The screen is opened from the bell icon on the Home screen and shows a list of notifications with optional deep links.

---

## Overview

- **Screen:** Notifications list (header: back, title "Notifications", "Clear all" button).
- **Data:** Each notification has a title, body, time, optional subtitle/type, optional unread state, and an optional **route** for deep linking when the user taps the row.
- **Read more:** The app truncates long body text (e.g. after 120 characters) and shows "Read more" / "Show less". The backend should return the **full body**; the client handles truncation.
- **Clear all:** The app can call an endpoint to clear (or mark all as read) so the list is empty or all read; see optional endpoints below.

---

## Endpoints

### 1. List notifications (required)

| Method | Path | Purpose |
|--------|------|--------|
| **GET** | `/api/v1/notifications` | Return the current user's notifications, newest first. |

**Authentication:** Required. Use `Authorization: Bearer <token>`.

**Query parameters (optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max number of items to return (default e.g. 50). |
| `offset` | integer | Pagination offset (default 0). |
| `unread_only` | boolean | If `true`, return only unread notifications. |

**Response: `200 OK`**

Return a JSON array of notification objects (or a wrapper with a `data` array; see shape below). Prefer **newest first**.

**Example (top-level array):**

```json
[
  {
    "id": "notif_abc123",
    "title": "Your order is ready",
    "body": "Order #DS-2024-001 has been completed and is ready for pickup. Visit your orders to see details and delivery options.",
    "created_at": "2026-02-22T10:00:00Z",
    "subtitle": "Order",
    "route": "/(tabs)/orders",
    "unread": true
  },
  {
    "id": "notif_def456",
    "title": "New message from your tailor",
    "body": "Hi! I've started working on your blazer.",
    "created_at": "2026-02-22T09:30:00Z",
    "subtitle": "Chat",
    "route": "/chat/1",
    "unread": true
  }
]
```

**Alternative (wrapper):** If your API standard is `{ "data": [ ... ] }`, the app can read `response.data`. Document which format you use.

---

## Notification item shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g. UUID or prefixed id). Used as list key and for mark-read/delete. |
| `title` | string | Yes | Short heading (e.g. "Your order is ready"). Shown in bold; app may show up to 2 lines. |
| `body` | string | Yes | Full notification text. App truncates long text and shows "Read more"; send the complete body. |
| `created_at` | string (ISO 8601) **or** `time` | One of these | When the notification was created. See **Time format** below. |
| `subtitle` | string | No | Category or type label (e.g. "Order", "Chat", "Promo", "Account"). Shown above the title in small caps. |
| `route` | string | No | Deep link path. When the user taps the notification, the app navigates to this route. Omit for non-clickable items. |
| `unread` | boolean | No | Whether the notification is unread. Default `true` if omitted. App uses this for visual state (e.g. accent border). |

### Time format

- **Option A (recommended):** Send `created_at` as ISO 8601 (e.g. `"2026-02-22T10:00:00Z"`). The app can format it as "2 min ago", "Yesterday", etc.
- **Option B:** Send a pre-formatted display string in a `time` field (e.g. `"2 min ago"`, `"Yesterday"`). If both `created_at` and `time` exist, the app may prefer `time` for display.

Ensure the app receives either `created_at` or `time` so the list can show when each notification was sent.

### Route (deep link) values

`route` is an app path. The app uses Expo Router; examples:

| Destination | Example `route` |
|-------------|------------------|
| Home (tabs) | `/(tabs)` |
| Orders list | `/(tabs)/orders` |
| Account | `/(tabs)/account` |
| Search | `/search` |
| Chat with conversation | `/chat/{conversationId}` |
| Order detail | `/order/{reference}` |
| Measurements | `/measurements` |
| Cart / review | `/review` |

Use the same path the app would use for `router.push(route)`. If `route` is omitted or empty, the notification row is still tappable but the app may do nothing (or open a generic detail). Invalid routes should be ignored by the app.

---

## Optional endpoints

### 2. Mark notification(s) as read

| Method | Path | Purpose |
|--------|------|---------|
| **PATCH** | `/api/v1/notifications/{id}` | Mark one notification as read. |
| **PATCH** | `/api/v1/notifications/read-all` | Mark all as read. |

**Request body (for PATCH single):** `{ "unread": false }` or similar.

**Response:** `200 OK` with updated notification or `{ "success": true }`.

### 3. Clear all (delete or mark read)

| Method | Path | Purpose |
|--------|------|---------|
| **DELETE** | `/api/v1/notifications` | Delete all notifications for the user (clear all). |
| **or PATCH** | `/api/v1/notifications/read-all` | Mark all as read instead of deleting. |

When the user taps "Clear all", the app can:

- Call **DELETE** `/api/v1/notifications` and then refetch (empty list), or
- Call **PATCH** read-all and then refetch (all read; or hide cleared items if backend supports "archived").

Document which behavior you implement so the app can call the correct endpoint.

### 4. Unread count (for badge)

To show a badge on the bell icon (e.g. "3"), the app may need an unread count:

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/api/v1/notifications/unread-count` | Return `{ "count": 3 }` for the current user. |

Optional; the app can also derive the count from the list response if it always fetches the full list.

---

## Example: minimal list response

```json
[
  {
    "id": "1",
    "title": "Payment received",
    "body": "We've received your payment for order #DS-2024-002.",
    "created_at": "2026-02-21T14:00:00Z",
    "subtitle": "Order",
    "route": "/(tabs)/orders",
    "unread": false
  }
]
```

---

## Error handling

- **401 Unauthorized:** Require login; app can show an empty state or prompt to sign in.
- **4xx/5xx:** App can show a retry or keep the previous list.

---

## Frontend integration notes

- The notifications screen currently uses **static data**. When the API is ready:
  1. Replace the static list with `GET /api/v1/notifications` (with auth).
  2. Map each item to the app's `NotificationItem` type (`id`, `title`, `body`, `time` or formatted `created_at`, `subtitle`, `route`, `unread`).
  3. Wire "Clear all" to your chosen clear/read-all endpoint and refetch or clear local state.
  4. Optionally use unread-count for the bell badge on Home.

- The app type is:

```ts
type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;        // display string, e.g. "2 min ago" or from created_at
  subtitle?: string;
  route?: string;
  unread?: boolean;
};
```

If the backend sends `created_at` instead of `time`, the app will format `created_at` to a display string before rendering.
