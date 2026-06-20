import { create } from 'zustand';
import type { CartItem, Product } from '../types';

type CartState = {
  items: CartItem[];
  discount: number;
  tax: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  setDiscount: (discount: number) => void;
  setTax: (tax: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
  totalProfit: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  tax: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { product, quantity: 1, unit_price: product.selling_price, discount: 0 },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      ),
    }));
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount } : i
      ),
    }));
  },

  updateItemPrice: (productId, price) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, unit_price: price } : i
      ),
    }));
  },

  setDiscount: (discount) => set({ discount }),
  setTax: (tax) => set({ tax }),
  clearCart: () => set({ items: [], discount: 0, tax: 0 }),

  subtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity - item.discount,
      0
    );
  },

  total: () => {
    const sub = get().subtotal();
    const afterDiscount = sub - get().discount;
    const taxAmount = afterDiscount * (get().tax / 100);
    return afterDiscount + taxAmount;
  },

  totalProfit: () => {
    return get().items.reduce(
      (sum, item) =>
        sum +
        (item.unit_price - item.product.cost_price) * item.quantity -
        item.discount,
      0
    );
  },
}));
