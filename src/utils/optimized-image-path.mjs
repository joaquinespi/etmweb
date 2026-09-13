// src/utils/optimized-image-path.mjs
//
// Utilidad compartida entre el script de build (scripts/optimize-images.mjs)
// y los componentes de Astro/React, para calcular de forma consistente
// dónde vive la versión optimizada de una imagen subida por TinaCMS.
//
// Soporta subcarpetas dentro de uploads (products/, activaciones/,
// locations/, marcas/), preservando la misma estructura en la salida.
//
// Ejemplos:
//   getOptimizedImagePath('/uploads/products/xiaomi-17.jpg', 'thumb')
//   → '/uploads/optimized/products/xiaomi-17-thumb.webp'
//
//   getOptimizedImagePath('/uploads/activaciones/banner.jpg', 'full')
//   → '/uploads/optimized/activaciones/banner.webp'

const UPLOADS_PREFIX = "/uploads/";

export function getOptimizedImagePath(originalPath, variant = "full") {
  if (!originalPath) return originalPath;

  // Rutas externas o ya optimizadas: no tocar.
  if (originalPath.includes("/uploads/optimized/") || originalPath.startsWith("http")) {
    return originalPath;
  }

  // Si no viene de /uploads/, no sabemos cómo optimizarla: se devuelve tal cual.
  if (!originalPath.startsWith(UPLOADS_PREFIX)) {
    return originalPath;
  }

  const relative = originalPath.slice(UPLOADS_PREFIX.length); // ej: products/xiaomi.jpg
  const lastSlash = relative.lastIndexOf("/");
  const subDir = lastSlash === -1 ? "" : relative.slice(0, lastSlash + 1); // ej: products/
  const filename = lastSlash === -1 ? relative : relative.slice(lastSlash + 1);

  const dotIndex = filename.lastIndexOf(".");
  const nameWithoutExt = dotIndex === -1 ? filename : filename.slice(0, dotIndex);

  const suffix = variant === "thumb" ? "-thumb" : "";
  return `${UPLOADS_PREFIX}optimized/${subDir}${nameWithoutExt}${suffix}.webp`;
}

export const IMAGE_VARIANTS = {
  thumb: { width: 400, suffix: "-thumb" }, // para tarjetas de catálogo
  full: { width: 1200, suffix: "" },        // para páginas de detalle / banners
};
