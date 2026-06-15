"use client";

import { create } from "zustand";
import type { CartItem, PaymentMethod } from "@/types";

interface POSState {
  cart: CartItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  isProcessing: boolean;
  searchQuery: string;
  activeCategory: string;

  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setProcessing: (processing: boolean) => void;
  setSearchQuery: (q: string) => void;
  setActiveCategory: (cat: string) => void;

  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  discount: 0,
  paymentMethod: "cash",
  isProcessing: false,
  searchQuery: "",
  activeCategory: "all",

  addToCart: (item) => {
    const { cart } = get();
    const existing = cart.find(
      (c) =>
        c.product_id === item.product_id &&
        c.product_type === item.product_type
    );

    if (existing) {
      const newQty = existing.quantity + item.quantity;
      set({
        cart: cart.map((c) =>
          c.product_id === item.product_id && c.product_type === item.product_type
            ? { ...c, quantity: newQty, total_price: c.unit_price * newQty }
            : c
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          { ...item, total_price: item.unit_price * item.quantity },
        ],
      });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((c) => c.product_id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((c) =>
        c.product_id === productId
          ? { ...c, quantity, total_price: c.unit_price * quantity }
          : c
      ),
    });
  },

  clearCart: () => set({ cart: [], discount: 0, paymentMethod: "cash" }),
  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),

  subtotal: () => get().cart.reduce((sum, item) => sum + item.total_price, 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
  itemCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),
}));
