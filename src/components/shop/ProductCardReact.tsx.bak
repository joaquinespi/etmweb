type Product = {
  id: string;
  title: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  category: string;
  url: string;
  hasDiscount?: boolean;
  saving?: string | null;
  images?: string[];
};

export default function ProductCardReact({ product }: { product: Product }) {
  const hasDiscount = product.hasDiscount;
  const saving = product.saving;

  return (
    <article className="group relative bg-white dark:bg-black dark:border dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="h-full w-full flex flex-col">
        <div className="relative p-4 flex flex-col items-center justify-items-start gap-1 min-h-36">
          <div className="w-full flex justify-start mb-4">
            <div className="bg-blue-50 dark:bg-transparent text-teal-600 px-2 py-1 rounded-md text-xs font-medium tracking-normal border border-teal-600">
              {product.category}
            </div>
            {hasDiscount && (
            <div className="bg-orange-50 dark:bg-transparent text-red-600 px-2 py-1 rounded-md text-xs font-medium tracking-normal border border-red-600 ml-2">
              Te ahorras S/{saving}
            </div>
            )}
          </div>

          <h3 className="font-body font-medium text-center text-base sm:text-xl text-gray-900 dark:text-white group-hover:text-red-600 transition-colors line-clamp-2">
            {product.title}
          </h3>

          <div className="flex items-baseline justify-center gap-3">
            <span className="text-lg font-medium text-gray-900 dark:text-white">S/ {product.salePrice || product.price}</span>
            {hasDiscount && (
              <span className="text-sm font-medium text-gray-900 dark:text-white/50 line-through">S/ {product.price}</span>
            )}
          </div>

          <p className="text-gray-900 dark:text-white text-sm line-clamp-1 text-center">
            {product.shortDescription || "-"}
          </p>

        </div>

        <div className="flex flex-col justify-end items-center p-4" >
          {/*  Botones  */}
          <div className="flex items-center space-y-1 gap-2">
            <a href={`${product.url}`} className="justify-center bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-900 transition-colors tracking-normal">
              Comprar ahora
            </a>
            <a href={`${product.url}`} className="justify-center border border-red-600 text-red-600 text-xs font-bold px-4 py-2 rounded-xl hover:text-red-400 hover:border-red-400 transition-colors tracking-normal">
              Más información
            </a>
          </div>
        </div>

        <div className="relative w-full aspect-square mt-auto overflow-hidden pointer-events-none">
          <img
            src={product.images?.[0] || "/uploads/placeholder.jpg"}
            alt={product.title}
            width={300}
            height={300}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
          />
        </div>
      </div>

    </article>
  );
}