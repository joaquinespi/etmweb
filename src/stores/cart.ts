import { persistentAtom } from '@nanostores/persistent';
import { computed } from 'nanostores';

// ── Tipos ─────────────────────────────────────────────────
export interface CartItem {
  slug: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  brand: string;
  maxStock?: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  count: number;
  lastUpdated: string;
}

const defaultState: CartState = {
  items: [],
  total: 0,
  count: 0,
  lastUpdated: '',
};

// persistentAtom serializa/deserializa JSON completo — sin problema de tipos
export const cartStore = persistentAtom<CartState>('cart', defaultState, {
  encode: JSON.stringify,
  decode: (str) => {
    try {
      const parsed = JSON.parse(str);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        total: Number(parsed.total ?? 0),
        count: Number(parsed.count ?? 0),
        lastUpdated: parsed.lastUpdated ?? '',
      };
    } catch {
      return defaultState;
    }
  },
});

// Store computado con tipos correctos — úsalo en componentes React
export const cartState = computed(cartStore, (s) => s);

// ── Acciones ──────────────────────────────────────────────

export const addToCart = (item: CartItem) => {
  const current = cartState.get();
  const existingIndex = current.items.findIndex((i) => i.slug === item.slug);
  const newItems = [...current.items];

  if (existingIndex >= 0) {
    const existing = newItems[existingIndex];
    newItems[existingIndex] = {
      ...existing,
      quantity: Math.min(existing.quantity + item.quantity, item.maxStock ?? 99),
    };
  } else {
    newItems.push(item);
  }

  updateCart(newItems);
};

export const removeFromCart = (slug: string) => {
  const current = cartState.get();
  updateCart(current.items.filter((i) => i.slug !== slug));
};

export const updateQuantity = (slug: string, quantity: number) => {
  const current = cartState.get();
  const newItems = current.items.map((item) =>
    item.slug === slug
      ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxStock ?? 99)) }
      : item,
  );
  updateCart(newItems);
};

export const clearCart = () => {
  cartStore.set({ items: [], total: 0, count: 0, lastUpdated: new Date().toISOString() });
};

const updateCart = (items: CartItem[]) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  cartStore.set({ items, total, count, lastUpdated: new Date().toISOString() });
};

// ── WhatsApp ──────────────────────────────────────────────

export const generateWhatsAppMessage = (
  phone: string,
  customerInfo?: { name?: string; address?: string; notes?: string },
): string => {
  const { items, total } = cartState.get();
  if (items.length === 0) return '';

  const itemsList = items
    .map(
      (item, index) =>
        `${index + 1}. *${item.title}* (${item.brand})\n` +
        `   Cant: ${item.quantity} × S/ ${item.price.toFixed(2)} = *S/ ${(item.price * item.quantity).toFixed(2)}*`,
    )
    .join('\n\n');

  let message = `*🛒 Nuevo Pedido - ExpansionTec*\n\n`;
  message += `*Productos:*\n${itemsList}\n\n`;
  message += `*💰 Total: S/ ${total.toFixed(2)}*\n\n`;

  if (customerInfo?.name) message += `*👤 Cliente:* ${customerInfo.name}\n`;
  if (customerInfo?.address) message += `*📍 Dirección:* ${customerInfo.address}\n`;
  if (customerInfo?.notes) message += `*📝 Notas:* ${customerInfo.notes}\n`;

  message += `\nPor favor confirmar disponibilidad. ¡Gracias!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
