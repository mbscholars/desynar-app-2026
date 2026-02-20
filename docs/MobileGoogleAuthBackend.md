# Mobile Google auth: redirect back to app

For logins started from the mobile app, the app passes `redirect_uri` so the backend can redirect the browser back to the app with the token.

## 1. Requesting the OAuth URL

```http
GET /api/v1/auth/social/oauth-url?provider=google&redirect_uri=https%3A%2F%2Fauth.expo.io%2F%40desynar%2Fdesynar
```

- **redirect_uri** (optional): The mobile app sends the Expo Auth proxy URL: `https://auth.expo.io/@desynar/desynar`. The backend must allow this redirect (and optionally other allowlisted URLs) to prevent open redirects.
- The backend stores this value keyed by the OAuth `state` (in cache, 15 min TTL) and uses the **backend** Google redirect URL so Google redirects to the API.
- When the callback is hit with that `state`, the backend exchanges the code, issues the JWT, then responds with an **HTTP redirect** to `{redirect_uri}?token={jwt}`.
- The app receives `https://auth.expo.io/@desynar/desynar?token=...`, parses the token and completes login.

**Requirements:**

- In **Google Cloud Console**, the backend callback URL must be registered as an authorized redirect URI (e.g. `https://api.desynar.com/api/v1/auth/social/google/callback`).
- The `redirect` in `config/services.php` must point to this backend URL.

## 2. Flow summary

| Step | Who     | Action                                                                                                                     |
| ---- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | App     | Calls `oauth-url?provider=google&redirect_uri=https://auth.expo.io/@desynar/desynar`                                       |
| 2    | Backend | Returns `oauth_url` (Google URL with **backend** callback URL); stores `redirect_uri` keyed by `state` (cache, 15 min TTL) |
| 3    | User    | Signs in in the in-app browser; Google redirects to backend callback with `code` and `state`                               |
| 4    | Backend | Exchanges `code`, issues JWT; if `state` has a stored `redirect_uri`, **HTTP redirect** to `redirect_uri?token={jwt}`      |
| 5    | App     | In-app browser closes on `https://auth.expo.io/@desynar/desynar?token=...`; app parses token and completes login           |

## 3. OAuth callback handling

The system handles OAuth callbacks at these endpoints:

- `GET /api/v1/auth/social/google/callback`
- `GET /api/v1/auth/social/facebook/callback`
- `GET /api/v1/auth/social/twitter/callback`
- `GET /api/v1/auth/social/linkedin/callback`

**Response (when no mobile `redirect_uri` is stored for the state):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "1|abc123...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "is_new_user": true
  }
}
```

When a mobile `redirect_uri` is stored for the given `state`, the backend responds with an **HTTP redirect** to `{redirect_uri}?token={jwt}` instead of returning this JSON.
