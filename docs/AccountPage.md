# Account Page

## Location

- **Screen:** `app/(tabs)/account.tsx`
- **Profile API:** `services/api/profile.ts`

## Overview

The account tab shows the current user’s profile (name, email, profile picture, phone, date joined), with **Log out** and **Delete account** actions. It uses theme tokens only and follows the same layout patterns as Inbox and Orders (header, safe area, atelier background).

## Authentication

- **Authenticated:** Profile is loaded via `getProfile()` (GET /api/v1/me or session fallback). User sees profile card, Log out, and Delete account.
- **Not authenticated:** User sees “Sign in to view your account” and a **Sign in** button that navigates to `/login`.
- Log out calls `logout()` from `useAuth()` then `router.replace('/login')`. Delete account shows a confirmation alert, then calls `deleteAccount()` and logs the user out.

## Features

- **Header:** “Account” title with safe area.
- **Profile card:**
  - Profile picture: avatar URL from API, or placeholder with initials (from name or email).
  - Name (full name or first + last).
  - Email (with envelope icon).
  - Phone (with phone icon; “—” if missing).
  - Date joined (with calendar icon; formatted e.g. “January 15, 2025”).
- **Log out:** Outline button; on success navigates to login.
- **Delete account:** Danger-styled button; confirmation alert (“Are you sure…?”); on confirm calls DELETE /api/v1/users/me (or equivalent), then logout and redirect to login.
- **Pull-to-refresh:** Refetches profile.
- **Loading:** Spinner and “Loading…” while profile is fetched.
- **Error:** Inline error message and Retry when profile fetch fails.

## API

| Action        | Function            | Endpoint / behavior                    |
| ------------- | ------------------- | ------------------------------------- |
| Load profile  | `getProfile()`       | `GET /api/v1/me` (fallback: session)  |
| Delete account| `deleteAccount()`   | `DELETE /api/v1/users/me`             |

Types: `UserProfile` (id, email, first_name, last_name, name, avatar?, phone?, created_at?, role?).

## Theme

Uses `@/constants/theme`: `atelier`, `colors`, `spacing`, `typography`, `radius`. No hardcoded hex except where theme tokens define them. Delete button uses `colors.danger[500]`.

## Accessibility

- Avatar has `accessibilityLabel="Profile picture"` when image is shown.
- Buttons have minimum tap target (48pt). Disabled state during logout/delete prevents double submit.
