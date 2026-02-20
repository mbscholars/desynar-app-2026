# Chat & Push Notifications

## Chat data

- **Source**: REST API only (`/api/v1/chats`). No WebSockets or Pusher.
- **In-app “live” updates**: When the user has a conversation open, the app can **poll** for new messages (e.g. every 5–10 seconds) so new messages appear without leaving the screen.
- All other chat actions (list conversations, send message, mark read) use the same REST endpoints.

## Push notifications: FCM

- **Firebase Cloud Messaging (FCM)** is used for push notifications (not Pusher).
- When a new chat message is created, the **backend** should send an FCM notification to the recipient’s device (using the user’s FCM token).
- The **app** should:
  - Register for FCM and store the token (e.g. send to backend on login).
  - Handle notification taps: open the app and navigate to the relevant conversation (`/chat/[id]`).
  - Optionally refresh conversation list or unread count when a notification is received in foreground.

FCM integration (token registration, notification handlers, and backend payload format) is to be implemented separately.
