/**
 * Shared formatters for display.
 */

export function formatPrice(
  amount: number | undefined,
  currency: string = "NGN",
): string {
  if (amount == null) return "—";
  return `${currency} ${(amount / 100).toLocaleString()}`;
}
