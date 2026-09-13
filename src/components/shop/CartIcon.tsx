import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore } from '../../stores/cart';
import CartDrawer from './CartDrawer';

export default function CartIcon() {
  const cart = useStore(cartStore);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 transition-colors"
        aria-label="Abrir carrito"
      >
        <svg fill="none" stroke="currentColor" className="w-6 h-6 text-gray-800 hover:text-orange-600 dark:text-white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4z" strokeWidth={2}/></svg>

        {Number(cart.count) > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {Number(cart.count) > 99 ? '99+' : cart.count}
          </span>
        )}
      </button>

      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}