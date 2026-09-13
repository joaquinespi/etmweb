import { useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  cartState,
  removeFromCart,
  updateQuantity,
  generateWhatsAppMessage,
} from '../../stores/cart';
import Icon from '../../components/ui/Icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = '51930569934';

export default function CartDrawer({ isOpen, onClose }: Props) {
  const cart = useStore(cartState);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    address: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (cart.items.length === 0) return;
    const url = generateWhatsAppMessage(WHATSAPP_NUMBER, customerInfo);
    window.open(url, '_blank');
    // clearCart();
    // onClose();
  };

  const isEmpty = cart.items.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tu Carrito</h2>
            <p className="text-sm text-gray-500">
              {cart.count} {cart.count === 1 ? 'producto' : 'productos'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Cerrar carrito"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEmpty ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-lg">Tu carrito está vacío</p>
              <button
                onClick={onClose}
                className="mt-4 text-blue-600 hover:underline font-medium"
              >
                Ir a la tienda →
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.slug} className="flex gap-4 border rounded-lg p-3 bg-white shadow-sm">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 object-cover rounded-md"
                  loading="lazy"
                  width={80}
                  height={80}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.brand}</p>
                  <p className="text-blue-600 font-bold">S/ {item.price.toFixed(2)}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                      className="w-8 h-8 rounded border hover:bg-gray-100 flex items-center justify-center"
                      aria-label="Reducir cantidad"
                    >−</button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                      className="w-8 h-8 rounded border hover:bg-gray-100 flex items-center justify-center"
                      aria-label="Aumentar cantidad"
                    >+</button>
                    <button
                      onClick={() => removeFromCart(item.slug)}
                      className="ml-auto text-red-500 hover:text-red-700 p-1"
                      aria-label="Eliminar producto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — solo visible cuando hay items */}
        {!isEmpty && (
          <div className="border-t bg-gray-50 p-4 space-y-4">
            <div className="flex justify-between items-center text-xl font-bold text-gray-800">
              <span>Total:</span>
              <span className="text-blue-600">S/ {cart.total.toFixed(2)}</span>
            </div>

            {!showCheckoutForm ? (
              <button
                onClick={() => setShowCheckoutForm(true)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Agregar datos de envío (opcional)
              </button>
            ) : (
              <div className="space-y-3 bg-white p-3 rounded-lg border">
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Dirección de entrega"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <textarea
                  placeholder="Notas adicionales..."
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                />
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Icon name="whatsapp" className="w-6 h-6" />
              Comprar por WhatsApp
            </button>

            <p className="text-xs text-center text-gray-500">
              Serás redirigido a WhatsApp para confirmar tu pedido
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
