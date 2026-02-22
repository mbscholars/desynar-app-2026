# Search — "You may like" suggestions (backend guide)

This document describes the API contract for the **"You may like"** section on the Search screen. The app uses this to show suggested search terms; the backend can return personalized or curated suggestions.

---

## Endpoint

| Method | Path | Purpose |
|--------|------|--------|
| **GET** | `/api/v1/search/suggestions` | Return a list of suggested search terms for the "You may like" section. |

---

## Authentication

- **Optional but recommended**: Send `Authorization: Bearer <token>` when the user is logged in so the backend can return personalized suggestions (e.g. based on past searches, likes, or preferences).
- If no token is sent, the backend should still respond with a non-personalized list (e.g. trending or default suggestions).

---

## Request

- **Query parameters** (all optional, for future use):
  - `limit` (integer, optional): Max number of suggestions to return. App will display all returned items; typical range 5–20.
  - `locale` (string, optional): Preferred locale/language for suggestion text.

Example:

```
GET /api/v1/search/suggestions
GET /api/v1/search/suggestions?limit=15
```

---

## Response

### Success: `200 OK`

Return a JSON object with a **list of suggestion items**. The app expects either:

**Option A — Array at top level (recommended):**

```json
[
  {
    "id": "1",
    "text": "street style",
    "highlighted": false
  },
  {
    "id": "2",
    "text": "minimal outfit",
    "highlighted": true
  }
]
```

**Option B — Wrapper object:**

```json
{
  "data": [
    {
      "id": "1",
      "text": "street style",
      "highlighted": false
    }
  ]
}
```

If you use Option B, the frontend will need to read `response.data`; currently the app is written to use Option A. Prefer **Option A** for consistency with other list endpoints (e.g. `/api/v1/clothes`).

---

## Suggestion item shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the suggestion (e.g. UUID or slug). Used as React `key`. |
| `text` | string | Yes | The search phrase to show and to use when the user taps (e.g. "street style", "minimal outfit"). |
| `highlighted` | boolean | No (default: false) | If `true`, the app shows the suggestion with a red bullet and semibold text to indicate trending or recommended. |

- **id**: Must be unique per item in the list. Can be a database ID, slug, or hash.
- **text**: Displayed as-is; avoid leading/trailing whitespace. When the user taps, the app navigates to search results with `q=<text>`.
- **highlighted**: Use for a small subset of items (e.g. trending or staff picks). Omit or set to `false` for normal suggestions.

---

## Example response (minimal)

```json
[
  { "id": "1", "text": "tank girl", "highlighted": true },
  { "id": "2", "text": "street style", "highlighted": false },
  { "id": "3", "text": "minimal outfit", "highlighted": false },
  { "id": "4", "text": "girls night", "highlighted": false }
]
```

---

## Error handling

- **401 Unauthorized**: App may retry without auth or show a non-personalized list; backend can also return 200 with default suggestions.
- **4xx/5xx**: App can keep showing the previous list (or a static fallback) and will retry when the user taps "Refresh".

---

## Frontend integration note

The Search screen currently uses static suggestions and a comment: *"replace with api/v1/search/suggestions later"*. Once this endpoint is implemented:

1. Replace the static list with a `GET /api/v1/search/suggestions` call (with auth if the user is logged in).
2. Map the response array to the same shape: `{ id, text, highlighted }`.
3. Use the same list on "Refresh" (replace the simulated delay with the real API call).

No change to the response shape is required if the backend returns the structure above.
