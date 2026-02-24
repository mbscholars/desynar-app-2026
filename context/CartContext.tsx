import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CartItem,
  CartItemCustomization,
  CartProfile,
  CartProduct,
} from "@/types/cart";
import { CART_STORAGE_KEY } from "@/types/cart";

/** Partial update for a cart line (e.g. after item details / try-on). */
export type CartItemUpdate = {
  product?: Partial<CartProduct>;
  quantity?: number;
  customization?: CartItemCustomization;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    product: CartProduct,
    selectedProfiles: CartProfile[],
    quantity?: number,
  ) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  /** Update line by lineId (merge customization, shallow-merge product). */
  updateItem: (lineId: string, update: CartItemUpdate) => void;
  clearCart: () => void;
  /** Sum of (item.price * item.quantity) for all items (holding fee total). Price in minor units. */
  holdingFeeTotal: number;
  /** Default currency for display when items use same currency. */
  currency: string;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (ctx == null) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function productToCartProduct(p: {
  id: number;
  imageUri: string;
  mediaUrls: string[];
  creatorName: string;
  creatorAvatar?: string;
  outfitName: string;
  description?: string;
  tags?: string[];
  price?: number;
  currency?: string;
  category?: string;
  organizationId?: number;
  outfit_source?: "upload" | "store" | "ai";
}): CartProduct {
  return {
    id: p.id,
    imageUri: p.imageUri,
    mediaUrls: p.mediaUrls ?? [],
    creatorName: p.creatorName,
    creatorAvatar: p.creatorAvatar,
    outfitName: p.outfitName,
    description: p.description,
    tags: p.tags,
    price: p.price,
    currency: p.currency ?? "NGN",
    category: p.category,
    organizationId: p.organizationId,
    outfit_source: p.outfit_source,
  };
}

function generateLineId(): string {
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Migrate legacy cart items (selectedProfileIds/selectedProfileNames) to selectedProfiles. */
function migrateCartItem(
  i: CartItem & { selectedProfileIds?: string[]; selectedProfileNames?: string[] },
): CartItem {
  if (i.selectedProfiles?.length) return i;
  const ids = i.selectedProfileIds ?? [];
  const names = i.selectedProfileNames ?? [];
  const selectedProfiles: CartProfile[] = ids.map((id, idx) => ({
    id,
    name: names[idx] ?? "Profile",
    frontImageUri: null,
    sideImageUri: null,
  }));
  const { selectedProfileIds: _a, selectedProfileNames: _b, ...rest } = i;
  return { ...rest, selectedProfiles };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as (CartItem & {
            selectedProfileIds?: string[];
            selectedProfileNames?: string[];
          })[];
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((i) => migrateCartItem(i));
            setItems(migrated);
          }
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // ignore
      }
    })();
  }, [hydrated, items]);

  const addItem = useCallback(
    (product: CartProduct, selectedProfiles: CartProfile[], quantity = 1) => {
      const cartProduct = productToCartProduct(product);
      setItems((prev) => [
        ...prev,
        {
          lineId: generateLineId(),
          product: cartProduct,
          quantity,
          selectedProfiles: selectedProfiles.map((p) => ({
            id: p.id,
            name: p.name,
            frontImageUri: p.frontImageUri ?? null,
            sideImageUri: p.sideImageUri ?? null,
          })),
        },
      ]);
    },
    [],
  );

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.lineId === lineId ? { ...i, quantity } : i,
      ),
    );
  }, []);

  const updateItem = useCallback((lineId: string, update: CartItemUpdate) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.lineId !== lineId) return i;
        const next: CartItem = { ...i };
        if (update.product != null) {
          next.product = { ...i.product, ...update.product };
        }
        if (update.quantity != null) next.quantity = update.quantity;
        if (update.customization !== undefined) {
          next.customization = update.customization;
        }
        return next;
      }),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const holdingFeeTotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
      0,
    );
  }, [items]);

  const currency = useMemo(() => {
    const first = items[0]?.product?.currency;
    return first ?? "NGN";
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateItem,
      clearCart,
      holdingFeeTotal,
      currency,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateItem,
      clearCart,
      holdingFeeTotal,
      currency,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}
