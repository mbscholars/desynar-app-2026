# Customer Order Create — Product-Level Implementation Guide

This document describes the **logic, aim, and feel** of the customer order-creation flow as implemented in `desynar/src/pages/customer/orders/create.vue` and `OrderingFlow.vue`. Use it as a product spec for parity or for building a mobile/other client.

---

## 1. Entry and gatekeeping (create.vue)

**Aim:** Only let the user into the ordering flow when prerequisites are met. Handle missing product or missing measurement profiles clearly.

**Flow:**

1. **Mount**
   - Show full-screen loading with a contextual message.
   - **First:** Fetch measurement profiles (GET measurement-profiles). If the list is **empty**, set loading to false and open the **“Measurement Profile Required”** modal. Do **not** show the ordering flow.
   - **If profiles exist:** Continue. If the URL has a `product` query param, treat it as a product ID and **validate** it (fetch product from store/catalog). If the product doesn’t exist or fetch fails, open the **“Product Not Found”** modal.
   - Set loading to false. Show **OrderingFlow** only when: not loading, no “no profile” modal, no “product not found” modal, and at least one measurement profile.

2. **“Measurement Profile Required” modal**
   - **Message:** User needs at least one measurement profile so their custom clothing can fit.
   - **Primary action:** “Add Measurement Profile” → navigate to customer measurements (e.g. `/customer/measurements`).
   - **Secondary:** “Cancel” → go back (e.g. to `/customer/orders`).

3. **“Product Not Found” modal**
   - **Message:** The product is no longer available or doesn’t exist.
   - **Primary action:** “Browse Catalog” → navigate to shop/catalog.
   - **Secondary:** “Start Fresh” → clear product from query and stay on create (order flow starts without a pre-selected product).

4. **Pass-through to OrderingFlow**
   - If a product was validated, pass `initialProductId` so the flow can start with that product (e.g. prefill “Choose outfit” or jump to the right step).
   - **Close** from OrderingFlow (e.g. X) → emit/handle close: go back or to orders, and clear any “product not found” state.

**Feel:** One clear blocker at a time (no profile vs invalid product). No ordering UI until the user can actually complete an order (profiles) and, when coming from a link, the product is valid or the user is sent to catalog/start fresh.

---

## 2. Ordering flow shell (OrderingFlow)

**Aim:** One full-screen, step-based flow with progress, optional try-on, cart, then payment and confirmation.

**Chrome (always visible):**

- **Progress header**
  - Current step title and icon.
  - Step X of 7 and a **progress bar** (percentage).
  - **Cart** entry point: if cart has items, show a cart icon and total item count; tapping jumps to **Step 5 (Review Cart)**.
  - **Points:** Optional “earned points” (e.g. +10 per step) for gamification.
  - **Close** (X): Exits flow (e.g. back or to orders).
- **Step indicators** (e.g. desktop): Pills or tabs for each step; completed steps show a check; current step highlighted; future steps disabled.
- **Footer:** Back (when step > 1), and a primary action that depends on step (Continue, Add to Cart, Proceed to Checkout, Pay, Done).

**Feel:** Linear but allow jumping to cart and back; progress is always visible; one primary action per step.

---

## 3. Step 1 — Choose outfit

**Aim:** User picks _one_ outfit for this order item from three sources: upload, catalog, or AI recommendations.

**Logic:**

- **Three options (cards):**
  1. **Upload image** — User’s own design/reference photo.
  2. **Pick from store** — Browse catalog with search.
  3. **AI recommend** — Get personalized suggestions (e.g. based on style/measurements).

- **Upload path**
  - Drag-and-drop or click to pick file (JPG, PNG, HEIC, WebP; max 10MB).
  - Validate type/size; show error (e.g. toast) if invalid.
  - **Compress** image (e.g. max ~400KB) then show preview.
  - **Upload** to backend (e.g. “upload outfit” API); on success, store `productId` and optional name; show success. On failure, show “Upload pending” and a **Retry** action; user can **Remove and upload another**.
  - This becomes the “selected outfit” for the current item.

- **Catalog path**
  - List catalog items (from store/API); optional **search**.
  - User taps one item to **select** it (visual highlight/check). Selected item = current outfit.

- **AI path**
  - CTA: “Generate Recommendations.” Call AI recommendation API (e.g. with user context/photos); show loading (“Analyzing your style…”).
  - Show grid of recommendations with optional “match” score; user taps one to **select**. Option to **Refresh** for new suggestions.

- **Proceed:** When an outfit is selected (from any source), **Continue** advances to Step 2. Optionally, if `initialProductId` was passed, pre-select that product and maybe auto-advance.

**Feel:** Clear three-way choice; upload is forgiving (retry/remove); catalog is scannable and searchable; AI feels personalized and light.

---

## 4. Step 2 — Customize design

**Aim:** Let the user refine the chosen outfit with AI edits, voice notes, or text instructions. All are optional but at least one is typically used.

**Logic:**

- **Preview**
  - Show the **current outfit image** (upload/catalog/AI). After an AI edit is **accepted**, show the customized image; optional “Clear customization” to revert to original.

- **Customization tabs**
  1. **AI**
     - Text area: “Describe your changes” (e.g. sleeve length, color, slit).
     - **Generate Preview** calls AI image-editing API; show loading/progress.
     - When result is ready, show new preview with **Accept** / **Try again**.
     - **Accept** → set as the outfit image for this item; optional upload of accepted image to backend.
     - **Revision history:** Keep a short list of prompts/previews; user can step back/forward (undo/redo) and optionally re-accept an earlier revision.
     - Limit generations (e.g. 10) and show remaining count.
  2. **Voice**
     - Record voice note (e.g. up to 60s). Show recording state and duration.
     - On stop: upload and transcribe; show playback, transcript, and “Uploaded successfully” or “Upload pending” with **Retry**. User can **Remove recording**.
  3. **Text**
     - Text area for written instructions (e.g. max 5000 chars). **Save** persists to the order item; show “Saved” state.

- **Proceed:** **Continue** goes to Step 3. Customizations are stored on the _current item_ (not yet in cart).

**Feel:** Non-destructive (clear customization, try again); AI feels iterative; voice and text are clear add-ons for the tailor.

---

## 5. Step 3 — Try-on (optional)

**Aim:** Let the user see the outfit on a body/avatar based on a measurement profile. Fully skippable.

**Logic:**

- **Default:** “Virtual Try-On” CTA and a **Skip for now** option.
- **Enable try-on:** User taps “Test on my avatar.” Load measurement profiles; user **selects one profile** (for avatar/body). Call try-on API (outfit + profile); show loading/progress.
- **Result:** Show rendered try-on image(s). If multiple angles, provide prev/next and counter (e.g. 1/3).
- **Actions:** “Looks good” (confirm and move on), “Request alterations” (e.g. back to Step 2), “Back to modify,” or **Regenerate** try-on.
- **Error:** Show message and **Try again**.
- **Skip:** If user skips, show a short note that the tailor will use the selected measurement profile; no try-on image is required to proceed.
- **Proceed:** **Continue** goes to Step 4 (with or without try-on).

**Feel:** Optional and non-blocking; “skip” is first-class; try-on is a confidence builder, not a gate.

---

## 6. Step 4 — Measurement profiles (who is it for)

**Aim:** Attach the current outfit to one or more measurement profiles and set quantity per profile (e.g. same design for self + gift).

**Logic:**

- **List:** Load measurement profiles (if not already). Show list with thumbnail (e.g. front-view image), name, and description (e.g. “self”).
- **Selection:** User taps a profile to **toggle** selection. Selected profiles get a check and optional **quantity** controls (minus/plus). Default quantity 1.
- **Multiple:** User can select multiple profiles and set different quantities (e.g. 2 for “self,” 1 for “spouse”).
- **Empty state:** If no profiles, show message and link to “Create a measurement profile” (e.g. `/customer/measurements`).
- **Add to cart**
  - When at least one profile is selected, show “Ready to add to cart?” with total item count.
  - **Add to Cart** (or “Update item” if editing): Create a **cart item** with outfit (preview, name, source, productId), customizations (voice, text, AI revisions, accepted image), and selected profiles + quantities. Append to cart (or update existing item if editing). Then either go to Step 5 or reset for “Add another item.”
  - If cart already has items, show **View Cart (n)** to jump to Step 5.
- **Proceed:** No separate “Continue”; advancing is via “Add to Cart” or “View Cart.”

**Feel:** “Who is this for?” is explicit; multi-profile and quantity support gifts and multiple pieces of the same design.

---

## 7. Step 5 — Review cart

**Aim:** Show all cart items, allow edit/remove, then move to checkout.

**Logic:**

- **Empty cart:** Message “Your cart is empty” and **Add your first item** → resets flow to Step 1 (new item).
- **Cart list:** For each item show:
  - Outfit thumbnail and name, source (upload/catalog/AI).
  - Tailor/organization name.
  - Customization badges (e.g. voice note, text instructions, AI edits).
  - “X profile(s), Y total item(s).”
  - **Edit** → load that item into the flow (outfit + customizations + profiles) and go to the appropriate step (e.g. 2 or 4) so user can change and **Update item**.
  - **Remove** → remove from cart (with optional confirm).
- **Add another item:** Button “Add another item” → reset current item and go to Step 1.
- **Summary:** Total designs, total items, estimated delivery (e.g. 2 weeks). Note that final pricing is from the tailor.
- **Proceed:** **Proceed to Checkout** → Step 6.

**Feel:** One place to see everything, fix mistakes (edit), or add more; pricing is set later by tailor.

---

## 8. Step 6 — Place order (payment)

**Aim:** Confirm order summary and pay a holding fee (e.g. ₦2,000) to create the order.

**Logic:**

- **Order summary:** Repeat cart summary (designs, items, delivery note).
- **Holding fee:** Explain that a fixed holding fee (e.g. ₦2,000) is charged now to create the order and reserve a tailor; final pricing and fabric options come from the tailor later.
- **Payment method:** Single option (e.g. Paystack) with short copy (card, bank transfer, USSD).
- **Pay button:** “Pay ₦2,000 Holding Fee” (or similar). On tap:
  - Create order via API (cart items, profiles, customizations) and get order reference and payment link if needed.
  - Open payment (e.g. Paystack). On success (redirect or callback), advance to Step 7. On failure, show error and allow retry.
- **Loading states:** “Creating order…”, “Opening payment…” to avoid double submit.

**Feel:** One clear amount, one payment method; user knows it’s a holding fee and that final price comes later.

---

## 9. Step 7 — Confirm and finish

**Aim:** Collect phone (if needed) and confirm order placement, then show success and exit.

**Logic:**

- **Phone confirmation (if required):**
  - “Confirm your phone number so your tailor can reach you.”
  - Input: phone number (e.g. +234…).
  - **Confirm & place order:** Validate and save phone (e.g. PATCH order or user). If payment was already completed in Step 6, this may only attach phone and mark order confirmed.
- **Success state:**
  - Optional confetti/success animation.
  - Message that order is placed (and maybe order reference).
  - **Done** → close flow (back or to orders list).
- If phone was already confirmed or not required, show success and **Done** immediately after payment.

**Feel:** Short, reassuring; one last piece of info (phone) then clear “you’re done.”

---

## 10. Cross-cutting behavior

- **Persistence:** Cart and current step can be in-memory; on mobile, consider persisting cart so it survives app restart.
- **Errors:** Every API call (upload, AI, try-on, create order, payment) has a user-visible error message and, where useful, a retry or “try again” action.
- **Loading:** Every async action shows a loading state (spinner, disabled button, or overlay) so the user knows something is in progress.
- **Accessibility:** Labels, focus order, and keyboard/click targets follow best practices; confirmations for destructive actions (e.g. remove from cart).
- **Close:** Header close (X) exits the flow without submitting; user can re-enter from orders or catalog.

---

## 11. Data shape (conceptual)

- **Current item (before add to cart):** outfit source, productId, preview URL, name; customizations (voice URL + transcript, text instructions, AI accepted image URL); selected measurement profile IDs and quantities.
- **Cart item:** Same as above plus stable id (e.g. UUID), tailor/organization id and name.
- **Order (submit):** List of cart items, each with productId, customizations, and list of { profileId, quantity }; optional phone at end.

---

## 12. Mobile (Expo) implementation note

On the home feed, tapping a product opens a **bottom sheet** (not a full-screen modal) built with `@gorhom/bottom-sheet` (`BottomSheetModal`). The sheet presents:

1. **Product panel** — Title, price, creator, category, “Make it now”, share.
2. **“Who is this for?” panel** — Horizontal list of measurement profile cards; “Add to Cart” and “Check out Now” in a fixed footer.

The sheet uses a 92% snap point, supports **pan-down-to-close**, and uses `BottomSheetModalProvider` at the app root. The close (X) and “Create a profile” actions call `dismiss()` so the sheet animates closed; `onDismiss` notifies the parent to clear selection and visibility.

---

## 13. Summary table

| Step | Name          | Aim                                     | Primary action          |
| ---- | ------------- | --------------------------------------- | ----------------------- |
| 1    | Choose outfit | Pick one outfit (upload / catalog / AI) | Continue                |
| 2    | Customize     | Optional AI, voice, text                | Continue                |
| 3    | Try-on        | Optional virtual try-on                 | Continue / Skip         |
| 4    | Profiles      | Who it’s for + quantity, add to cart    | Add to cart / View cart |
| 5    | Review cart   | Edit, remove, add more                  | Proceed to checkout     |
| 6    | Payment       | Pay holding fee                         | Pay                     |
| 7    | Confirm       | Phone (if needed), success              | Done                    |

This describes the **logic, aim, and feel** of the customer order create flow for product-level documentation and implementation parity.
