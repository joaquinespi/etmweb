import { useState } from 'react';
import { addToCart } from '../../stores/cart';

interface Props {
  product: {
    slug: string;
    title: string;
    price: number;
    image: string;
    brand: string;
    inStock: boolean;
    stockQuantity?: number;
  };
}

export default function AddToCart({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);

  if (!product.inStock) {
    return (
      <button
        disabled
        className="w-full bg-gray-200 text-gray-500 py-3 px-6 rounded-lg font-semibold cursor-not-allowed"
      >
        Producto agotado
      </button>
    );
  }

  const handleAdd = () => {
    addToCart({
      slug: product.slug,
      title: product.title,
      price: product.price,
      quantity,
      image: product.image,
      brand: product.brand,
      maxStock: product.stockQuantity || 10
    });

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
    setQuantity(1);
  };

  return (
    <div className="space-y-3">
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Cantidad:</span>
        <div className="flex items-center border rounded-lg bg-white">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-2 hover:bg-gray-100 rounded-l-lg transition-colors"
            disabled={quantity <= 1}
          >−</button>
          <span className="px-4 py-2 min-w-[3rem] text-center font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-2 hover:bg-gray-100 rounded-r-lg transition-colors"
            disabled={quantity >= (product.stockQuantity || 10)}
          >+</button>
        </div>
      </div>

      {/* Botón agregar */}
      <button
        onClick={handleAdd}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
          showToast
            ? 'bg-green-500 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {showToast ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Agregado al carrito
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Agregar al carrito
          </>
        )}
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          ¡Producto agregado! 🛒
        </div>
      )}
    </div>
  );
}