import { useState, useMemo, useEffect } from "react";
import ProductCardReact from "./ProductCardReact.tsx";

export default function FilterPanel({
  products,
  brands,
  categories,
  locations,
}: any) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [activeBrand, setActiveBrand] = useState("Todas");
  const [activeLocation, setActiveLocation] = useState("Todas");
  const [sortOrder, setSortOrder] = useState("Más recientes");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;

  const filteredProducts = useMemo(() => {
    return products
      .filter((p: any) => {
        const matchesSearch = p.title
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory =
          activeCategory === "Todas" || p.category === activeCategory;
        const matchesBrand =
          activeBrand === "Todas" || p.brand === activeBrand;
        const matchesLocation =
          activeLocation === "Todas" || p.locations.includes(activeLocation);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesBrand &&
          matchesLocation
        );
      })
      .sort((a: any, b: any) => {
        if (sortOrder === "Precio: Bajo a Alto") return a.price - b.price;
        if (sortOrder === "Precio: Alto a Bajo") return b.price - a.price;
        return 0;
      });
  }, [
    search,
    activeCategory,
    activeBrand,
    activeLocation,
    sortOrder,
    products,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory, activeBrand, activeLocation, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages || 1);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, safePage]);

  return (
    <div className="space-y-12">
      <div className="bg-white rounded-lg shadow-md p-4 dark:border dark:border-gray-100 dark:bg-black">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full px-6 py-4 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-600/50 text-xl text-gray-700 placeholder:text-gray-300 transition-all dark:text-white dark:placeholder-gray-100"
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-2 mt-2">
            <FilterDropdown
              label="Categorías"
              options={categories}
              active={activeCategory}
              onChange={setActiveCategory}
            />
            <FilterDropdown
              label="Sedes"
              options={locations}
              active={activeLocation}
              onChange={setActiveLocation}
            />
            <FilterDropdown
              label="Marcas"
              options={brands}
              active={activeBrand}
              onChange={setActiveBrand}
            />
            <FilterDropdown
              label="Ordenar por"
              options={[
                "Más recientes",
                "Precio: Bajo a Alto",
                "Precio: Alto a Bajo",
              ]}
              active={sortOrder}
              onChange={setSortOrder}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
          {filteredProducts.length} productos encontrados
        </p>

        {totalPages > 1 && (
          <p className="text-sm text-gray-400 dark:text-gray-400">
            Página {safePage} de {totalPages}
          </p>
        )}
      </div>

      {filteredProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {paginatedProducts.map((product: any) => {
              const hasDiscount =
                product.salePrice && product.salePrice < product.price;
              const saving = hasDiscount
                ? (product.price - product.salePrice).toFixed(2)
                : null;

              return (
                <div
                  key={product.id}
                  className="animate-in fade-in duration-500"
                >
                  <ProductCardReact
                    product={{ ...product, hasDiscount, saving }}
                  />
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-black dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
              >
                Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-10.5 px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                      page === safePage
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-black dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage === totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-black dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">
            No se encontraron productos que coincidan con tu búsqueda.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({ label, options, active, onChange }: any) {
  return (
    <div className="group relative py-2">
      <div className="flex items-center gap-2 cursor-pointer">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          {label}:
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {active}
        </span>
        <svg
          className="w-4 h-4 text-gray-400 group-hover:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 dark:bg-black dark:border-gray-700">
        <button
          onClick={() => onChange("Todas")}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            active === "Todas"
              ? "bg-red-50 text-red-600"
              : "hover:bg-gray-50 text-gray-600 dark:text-white dark:hover:text-black"
          }`}
        >
          Todas
        </button>

        {options.map((opt: any) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active === opt
                ? "bg-orange-50 text-red-600"
                : "hover:bg-gray-50 text-gray-600 dark:text-white dark:hover:text-black"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}