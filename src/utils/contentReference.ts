/**
 * Convierte una referencia de TinaCMS a un ID/slug utilizable por Astro.
 *
 * Soporta tanto el formato antiguo:
 *   apple
 *   equipo-celular
 *
 * como el formato Tina reference:
 *   src/content/brands/apple.json
 *   src/content/categories/equipo-celular.json
 *   src/content/locations/pdv-chosica.md
 */
export function referenceToId(
  value: string | null | undefined,
): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  const normalized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");

  if (!normalized) {
    return "";
  }

  const filename = normalized.split("/").pop() ?? normalized;

  return filename.replace(/\.(json|md|mdx)$/i, "");
}

/**
 * Comprueba si una referencia corresponde a un ID determinado.
 *
 * Ejemplos:
 *
 * referenceMatches("apple", "apple")                         => true
 * referenceMatches("src/content/brands/apple.json", "apple") => true
 */
export function referenceMatches(
  value: string | null | undefined,
  id: string,
): boolean {
  return referenceToId(value) === id;
}