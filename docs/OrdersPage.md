# Orders Page (Customer)

## Location

- **Screen:** `app/(tabs)/orders.tsx`
- **Order detail:** `app/order/[reference].tsx`

## Overview

The orders page is the main place where logged-in customers see and manage their tailoring orders. It lists orders with filtering, sorting, pagination, and draft handling, and mirrors the behavior of the Vue customer orders page (`desynar/src/pages/customer/orders/index.vue`).

## Authentication

- All order API calls use **Bearer token** from `getToken()` (SecureStore key `web_auth_token`). The API client attaches the header when `requiresAuth` is not false.
- **After sign-in:** Call `login(token)` from `useAuth()` so the token is stored and `isAuthenticated` is set. Orders then load with the user’s token.
- **Session restore:** On app load, `AuthContext` checks for an existing token; if present, `isAuthenticated` is set to true so the orders list loads without requiring sign-in again.

## Features

- **Header:** “Your Orders” title and **New Order** button (primary CTA).
- **New Order:** If the user has no measurement profiles, a modal explains the need and offers **Add Measurement Profile** (navigate to Account). Otherwise navigates to the Add tab.
- **Controls:** “Showing X of Y” when the list is not empty; sort: Newest, Oldest, Price ↑, Price ↓.
- **Status filters:** All, Drafts, In Progress, Completed, Cancelled (horizontal scroll pills with counts per filter).
- **Drafts section:** When filter is “All” and there are drafts, a “Continue Where You Left Off” horizontal strip shows draft cards with Continue, Delete, Duplicate, Pay, View, Contact, Edit.
- **Orders list:** Paginated (10 per page) list of order cards. Each card shows thumbnail, status badge, outfit name, date, tailor, and actions: View, Contact, Edit; for drafts also Continue, Pay, Delete, Duplicate; for active orders also Cancel.
- **Empty state:** “Your wardrobe awaits” and “Create Your First Order” when there are no orders; “No orders in this filter” when the filter has no results.
- **Pull-to-refresh:** Refetches orders and measurement profiles.
- **Order detail:** Tapping View (or card) navigates to `/order/[reference]` for details, pay holding fee, and edit.

## API Calls

| Action          | API / store                            | Endpoint / behavior                |
| --------------- | -------------------------------------- | ---------------------------------- |
| Load orders     | `ordersApi.getList({ per_page: 100 })` | `GET /api/v1/orders?per_page=100`  |
| Load profiles   | `measurementProfilesApi.getList()`     | `GET /api/v1/measurement-profiles` |
| Cancel / delete | `ordersApi.cancel(orderId)`            | `POST /api/v1/orders/:id/cancel`   |
| Order detail    | `ordersApi.getByReference(ref)`        | `GET /api/v1/orders/:reference`    |

## Navigation

- **New Order (with profiles):** `router.push('/(tabs)/add')`
- **No profile modal → Add Measurement Profile:** `router.push('/(tabs)/account')`
- **View / Edit / Pay holding:** `router.push(\`/order/${order.reference}\`)`
- **Contact tailor (with order context):** `router.push(\`/(tabs)/inbox?order=${order.id}\`)` so chat can open for that order.
- **Duplicate (drafts):** `router.push('/(tabs)/add')`

## Status Groups

- **Draft:** `draft`
- **Active (in progress):** `pending`, `accepted`, `awaiting_payment`, `paid`, `in_progress`, `quality_check`, `ready`, `pending_acceptance`, `invoice_sent`, `in_production`, `ready_for_delivery`
- **Completed:** `completed`, `delivered`
- **Cancelled:** `cancelled`, `rejected`, `refunded`

## Theme

Uses `@/constants/theme`: `colors`, `spacing`, `typography`, `radius`, `shadows`. No hardcoded hex colors.

## Accessibility

- Buttons and cards use minimum tap targets (44pt where applicable).
- Status and labels use readable font sizes and contrast from theme tokens.
