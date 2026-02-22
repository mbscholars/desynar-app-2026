# Checkout Screen

Checkout flow: order summary → create batch → open payment link → verify → success or failure.

## Entry

- **Review screen** → user taps **Proceed to Checkout** → navigates to `/checkout`.

## Phases

1. **summary** – Order summary (cart items, total designs, total items, holding fee N2,000). **Continue to pay** creates the order and shows the Paystack payment page **inside the app** in a WebView.
2. **creating** – Loading overlay while `ordersApi.createBatch` runs.
3. **awaiting_payment** – Full-screen in-app WebView loads the Paystack checkout URL. User pays there (card, bank, USSD, etc.) without leaving the app. When Paystack redirects to **desynar://payment-success?reference=xxx** (callback_url), the app intercepts the URL, verifies the payment automatically, and shows success—no button tap needed. **I’ve completed payment** remains as a fallback if redirect is not used; **Reload payment page** reloads the WebView if needed.
4. **verifying** – Loading while `ordersApi.verifyPaystackPayment(reference)` runs.
5. **success** – Thank-you screen: order confirmed, “we’re working on it,” up to 24 hours for response, reassurance copy. **View my orders** → `/(tabs)/orders`.
6. **failed** – Error banner with message; **Try payment again** (returns to WebView) or **Back to summary**.

## Payment flow (aligned with OrderingFlow step 6)

- **Create order:** `POST /api/v1/orders` with `CreateBatchOrderRequest` (payment*method, items with organization_id, outfit*\*, customizations, profiles).
- **Response:** `orders` + `holding_fee` (`payment_url`, `reference`).
- **In-app payment:** A full-screen `WebView` (react-native-webview) loads `holding_fee.payment_url` so the user completes Paystack checkout inside the app (no browser redirect).
- **Callback URL (redirect):** The app sends `callback_url: 'desynar://payment-success'` in the create-batch request. The backend must pass this to Paystack when initializing the transaction (Paystack’s `callback_url`). After payment, Paystack redirects to that URL (Paystack may append `?reference=xxx`). The WebView’s `onShouldStartLoadWithRequest` intercepts any load to `desynar://payment-success`, parses the reference, calls verify, and shows success—no manual “I’ve completed payment” tap needed. If your backend/Paystack only allow https callback URLs, use an https redirect page that redirects to `desynar://payment-success?reference=REF`.
- **Verify:** Either (1) automatic: redirect to desynar://payment-success triggers verify with the reference from the URL, or (2) manual fallback: user taps **I’ve completed payment** → `POST /api/v1/paystack/payment-verification` with stored `reference`. On success, cart is cleared and phase → success. On failure, phase → failed with message.

## Success copy

- Thank you; order confirmed; we’re working on it.
- Tailor will respond within 24 hours (fabric options, final pricing, delivery).
- Reassurance: “We’ve got you. Sit back and we’ll take it from here.”
- Order reference shown when available.

## Payload (cart → API)

- **payment_method:** `"paystack"`.
- **callback_url:** `"desynar://payment-success"` (optional). Backend should pass this to Paystack as `callback_url` when initializing the transaction so Paystack redirects here after payment; the app then auto-verifies. If Paystack requires https, the backend can use an https URL that redirects to `desynar://payment-success?reference=REF`.
- Each cart item → `CreateBatchOrderItem`: product_id, **organization_id: 1** (static), outfit_name, outfit_source (upload | store | ai), outfit_preview, customizations, profiles.
- API returns `holding_fee.payment_url` (e.g. `https://checkout.paystack.com/...`), which is loaded inside the app in a WebView.

## Accessibility

- PageHeader back/close; all buttons have min tap target.
- Loading and error states are announced via visible text.

## Collect payment and notify backend

This flow is exactly “collect payment in the app, then send to an endpoint on success”: Paystack collects the payment inside the WebView; on success Paystack redirects to `desynar://payment-success?reference=xxx`; the app intercepts that URL and calls `POST /api/v1/paystack/payment-verification` with the reference. The amount is fixed (holding fee) and known before checkout; the backend creates the transaction and returns the payment URL, and verification confirms the payment with Paystack and updates the order. No separate “payment collection” package is required: the WebView + redirect + verify endpoint is the standard pattern. For native card entry (no WebView), packages like `paystack-react-native` exist but require the backend to support Paystack’s charge-by-token or similar server-side API.

## Files

- `app/checkout.tsx` – Single screen handling all phases; uses `react-native-webview` for in-app Paystack checkout and intercepts `desynar://payment-success` to auto-verify.
- `services/api/orders.ts` – `createBatch` (with optional `callback_url`), `verifyPaystackPayment`, and related types.
- Dependency: `react-native-webview` (Expo-compatible).
- App scheme `desynar` is registered in `app.json` so that `desynar://payment-success?reference=xxx` is handled by the app; the checkout WebView intercepts this URL and triggers verification.
