// src/lib/images.ts
//
// Helper para resolver las rutas de imágenes optimizadas generadas por el
// pipeline de subida (public/uploads/optimized/**).
//
// Convención observada:
//   Original:  /uploads/{archivo}.{png,jpg,webp,...}          (sliders, categories, brands...)
//   Original:  /uploads/{subcarpeta}/{archivo}.{png,jpg,...}   (products: /uploads/products/...)
//
//   Full:      /uploads/optimized/[<subcarpeta>/]{archivo}.webp
//   Thumb:     /uploads/optimized/[<subcarpeta>/]{archivo}-thumb.webp
//
// Notas importantes:
// 1. El pipeline de optimización SIEMPRE convierte a .webp, sin importar
//    la extensión original (.png, .jpg, .jpeg, etc. -> .webp). Por eso la
//    extensión de salida está fijada a OPTIMIZED_EXT, nunca se reutiliza
//    la extensión del original.
// 2. Cuando el original YA incluye la subcarpeta como parte de su propia
//    ruta (ej. products: "/uploads/products/xxx.png"), NO se debe pasar
//    esa subcarpeta de nuevo: se duplicaría (products/products/xxx).
//    El helper simplemente preserva cualquier subruta que venga después
//    de "/uploads/" y le antepone "optimized/".

const UPLOADS_PREFIX = "/uploads/";
const OPTIMIZED_SEGMENT = "optimized";
const OPTIMIZED_EXT = ".webp";

/**
 * Dada la ruta original guardada en el content collection
 * (ej. "/uploads/products/xxx.png" o "/uploads/xxx.jpg"), devuelve las
 * rutas optimizadas (full y thumb) dentro de /uploads/optimized/,
 * preservando cualquier subcarpeta ya presente en el path original y
 * normalizando siempre la extensión de salida a .webp.
 *
 * Si la ruta no cae dentro de /uploads/ (ej. ya es una URL externa/CDN),
 * se devuelve tal cual sin modificar, como fallback seguro.
 */
export function getOptimizedImage(originalPath: string) {
  if (!originalPath || !originalPath.startsWith(UPLOADS_PREFIX)) {
    return { full: originalPath, thumb: originalPath };
  }

  const relativePath = originalPath.slice(UPLOADS_PREFIX.length);

  const lastSlash = relativePath.lastIndexOf("/");
  const dir = lastSlash === -1 ? "" : relativePath.slice(0, lastSlash + 1);
  const filename = lastSlash === -1 ? relativePath : relativePath.slice(lastSlash + 1);

  const dotIndex = filename.lastIndexOf(".");
  const name = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
  // Extensión original ignorada a propósito: el pipeline siempre exporta .webp.

  const basePath = `${UPLOADS_PREFIX}${OPTIMIZED_SEGMENT}/${dir}`;

  return {
    full: `${basePath}${name}${OPTIMIZED_EXT}`,
    thumb: `${basePath}${name}-thumb${OPTIMIZED_EXT}`,
  };
}
