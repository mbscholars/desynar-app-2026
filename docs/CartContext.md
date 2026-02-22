# Cart Context (Persistent Device Cart)

In-memory cart persisted to device storage. No backend; all data stays on the device.

## Storage

- **Key:** `@desynar_cart` (from `types/cart.ts`).
- **Format:** JSON array of `CartItem[]`.
- **Library:** `@react-native-async-storage/async-storage`. Write on every change after hydration.

## Types (`types/cart.ts`)

- **CartProduct** — Snapshot of product fields used in cart (id, imageUri, outfitName, description, price, currency, etc.).
- **CartItem** — `{ lineId, product: CartProduct, quantity, selectedProfileIds: string[] }`.
- **lineId** — Unique per line (e.g. `line_<timestamp>_<random>`). Used for update/remove.

## API (`useCart()`)

| Method / value                                    | Description                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `items`                                           | Current cart lines.                                              |
| `addItem(product, selectedProfileIds, quantity?)` | Append a line. `quantity` defaults to 1.                         |
| `removeItem(lineId)`                              | Remove one line.                                                 |
| `updateQuantity(lineId, quantity)`                | Set quantity for a line (no-op if &lt; 1).                       |
| `clearCart()`                                     | Remove all lines.                                                |
| `holdingFeeTotal`                                 | Sum of `(product.price * quantity)` for all lines (minor units). |
| `currency`                                        | Currency of first item, or `"NGN"`.                              |

## Usage

- **Provider:** Wrap app (or subtree) with `CartProvider` in `app/_layout.tsx`.
- **Add from feed:** From product drawer, “Add to Cart” or “Check out Now” calls `addItem(item, selectedProfileIds)`. “Check out Now” also navigates to `/review`.
- **Review screen:** Reads `items`, `updateQuantity`, `removeItem`, `holdingFeeTotal`, `currency` to render list and summary.

## Price

- Stored in **minor units** (e.g. kobo for NGN). Display with `formatPrice(amount, currency)` from `@/utils/format` (divides by 100 and formats).
