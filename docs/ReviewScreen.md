# Review Screen (Order Summary)

Order summary / review screen for the persistent device cart. No backend; cart is stored in AsyncStorage.

## Route

- **Path:** `/review`
- **File:** `app/review.tsx`
- **Stack:** Root stack (header with back, no tab bar on this screen).

## Layout (top to bottom)

1. **Header** — `< Back` left, `Review` center (no right action). Uses `PageHeader` with variant `back`.
2. **Cart items** — Scrollable. Each line: image (3:4 ratio, fixed width), product name, short description, price (line total), **Customize** (secondary), quantity `- 1 +`. 24px gap between items. Empty state: icon + “Your cart is empty” + short message.
3. **Upsell** (optional) — “You might like to add” + horizontal scroll. Placeholder for future cards.
4. **Cost summary** — Divider, then **Holding Fee** + formatted total. Sticky above the CTA.
5. **Sticky CTA** — Bottom bar: total on left, **Proceed to Checkout** button (54px height). Disabled when cart is empty. Safe area respected.

## Interactions

- **Quantity +/-** — Updates quantity for that line; price and holding fee update live.
- **Customize** — Placeholder; can later open product or customization flow.
- **Proceed to Checkout** — Placeholder; can later navigate to payment or confirmation.
- CTA is disabled when `items.length === 0`.

## Data

- Uses `useCart()` from `@/context/CartContext`.
- Display: `items`, `updateQuantity`, `removeItem`, `holdingFeeTotal`, `currency`.
- Price formatting: `formatPrice(amount, currency)` from `@/utils/format` (amount in minor units, e.g. kobo).

## Accessibility

- Back button: “Go back”.
- Quantity buttons: “Decrease quantity” / “Increase quantity”.
- Customize: “Customize”.
- Min tap targets (e.g. quantity, Customize) meet 44pt where possible.

## Theme

- Uses `colors`, `radius`, `shadows`, `spacing`, `typography` from `@/constants/theme` only.
