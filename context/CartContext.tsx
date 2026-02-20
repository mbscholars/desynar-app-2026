import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { CartItem, CartProduct } from "@/types/cart";
import { CART_STORAGE_KEY } from "@/types/cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (
    product: CartProduct,
    selectedProfileIds: string[],
    quantity?: number,
    selectedProfileNames?: string[],
  ) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
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
  };
}

function generateLineId(): string {
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartItem[];
          if (Array.isArray(parsed)) setItems(parsed);
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
    (
      product: CartProduct,
      selectedProfileIds: string[],
      quantity = 1,
      selectedProfileNames?: string[],
    ) => {
      const cartProduct = productToCartProduct(product);
      setItems((prev) => [
        ...prev,
        {
          lineId: generateLineId(),
          product: cartProduct,
          quantity,
          selectedProfileIds: [...selectedProfileIds],
          selectedProfileNames: selectedProfileNames ?? [],
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
      clearCart,
      holdingFeeTotal,
      currency,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      holdingFeeTotal,
      currency,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}
