# Order Detail Screen

Luxury MTM order dossier: the screen shown when a customer taps an order from the orders list. Reinforces exclusivity, clarity, and trust.

## Location

- **Route:** `app/order/[reference].tsx`
- **Navigation:** From orders tab via `router.push(\`/order/${order.reference}\`)`

## API

- **Endpoint:** `GET /api/v1/orders/:reference`
- **Client:** `ordersApi.getByReference(reference)`
- **Response type:** `OrderSingleResponse` — `{ success, data: { order: OrderDetail, chat?: OrderChat } }`

## Page structure (7 sections)

1. **Hero order summary** — Large outfit image (3:4), outfit name, order reference, status badge, atelier name with verified badge, created date. Status uses client-facing labels (e.g. "Awaiting Final Confirmation", "Reservation Secured").
2. **Order progress timeline** — Vertical timeline: Holding Fee Paid ✓, Design Confirmation, Measurement Validation, Production, Quality Review, Dispatch.
3. **Payment summary** — Holding fee amount, method (e.g. Paystack), status (Successful). Note: "Final invoice will be issued before production." Pay Holding Fee CTA when applicable.
4. **Measurements** — Profile name(s), unit, snapshot date. Copy: "Measurements secured and attached to this order."
5. **Customization & design** — Design type (e.g. Made-To-Measure), Generated via (e.g. Outfit Generator), Style, Fit. CTA: "Add Notes for Your Tailor."
6. **Communication hub** — Primary CTA: "Message Your Atelier" (navigates to `/chat/:id` or inbox with order context).
7. **Activity log** — Collapsible. Curated activity descriptions only (e.g. "Assigned to Your Atelier"); no IP or technical logs.

## Status and language

- **API status/stage** are mapped to reassuring client labels (see `STATUS_CLIENT_LABELS`, `STAGE_LABELS` in screen).
- **Reservation Secured** when `meta.holding_fee_paid === true`.
- Activity text is rewritten where needed (e.g. "Order automatically assigned to X" → "Assigned to Your Atelier").

## Theme

- **Background:** `atelier.background` (#0E0E0E)
- **Panels:** `atelier.panel`, `atelier.panelBorder`
- **Accent:** `atelier.accent` (gold) for badges, timeline done state, CTAs
- **Text:** `atelier.cta`, `atelier.muted`; typography from `constants/theme`

## Actions

- **Back** — `router.back()`
- **Message Your Atelier** — `router.push(\`/chat/${chatId}\`)`or inbox with`order` param
- **Add Notes for Your Tailor** — Alert with option to open message thread
- **Pay Holding Fee** — Placeholder alert (payment flow TBD)
- **Cancel order** — Shown when status is draft/pending_acceptance/pending_payment; calls `ordersApi.cancel(order.id)` then navigates back

## Types (services/api/types.ts)

- `OrderDetail` — Order with `customizations`, `profiles`, `transactions`, `activities`, `chats`, `organization.verified`, extended `meta`.
- `OrderSingleResponse` — `{ success, data: { order, chat? } }`
- Supporting: `OrderCustomization`, `OrderProfile`, `OrderTransaction`, `OrderActivity`, `OrderChat`, etc.

## Accessibility

- Back button and primary CTAs meet 44pt minimum tap target.
- Section titles and labels provide structure; no raw API jargon in labels.
