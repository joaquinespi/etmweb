// scripts/migrate-brand-categories.mjs
//
// Migra un CSV histórico de relación MARCA <-> TIPO PRODUCTO hacia los
// JSON actuales de src/content/brands/.
//
// Para cada marca genera o actualiza una estructura como:
//
// {
//   "name": "Honor",
//   "logo": "/uploads/marcas/1742419238332-logo_honor.webp",
//   "website": "https://www.logitech.com",
//   "categories": ["accesorios", "equipo-celular"]
// }
//
// Reglas:
// - Agrupa todas las filas del CSV que pertenecen a una misma marca.
// - Conserva los campos existentes (logo, website y otros) de los JSON
//   que ya existen en src/content/brands/.
// - Actualiza las categorías desde el CSV.
// - Para marcas nuevas crea logo/website demo para poder editarlas en TinaCMS.
// - Modo simulación por defecto: no escribe archivos sin --write.
// - Reporta tipos de producto sin mapeo.
//
// Uso:
//   npm run migrate:brand-categories
//   npm run migrate:brand-categories:write
//
// O directamente:
//   node scripts/migrate-brand-categories.mjs
//   node scripts/migrate-brand-categories.mjs --write
//
// Después de una migración real:
//   npm run generate:options
//   npm run dev

import fs from "node:fs";
import path from "node:path";

// Ajusta esta ruta si colocas el archivo en otra ubicación.
// Ejemplos alternativos:
// const CSV_PATH = "./MARCA.csv";
// const CSV_PATH = "./data/MARCA.csv";
const CSV_PATH = "./data/MARCA.csv";

const BRANDS_DIR = "./src/content/brands";
const WRITE_MODE = process.argv.includes("--write");

// Valores demo para nuevas marcas. Se mantienen como valores válidos para
// que el schema Zod no falle y sean visibles/editables desde TinaCMS.
//
// BrandList.astro debe evitar enlazar a PLACEHOLDER_WEBSITE para no enviar
// visitantes a una URL ficticia mientras la marca aún no está completada.
const PLACEHOLDER_WEBSITE = "https://www.example.com";
const PLACEHOLDER_LOGO_PREFIX = "/uploads/marcas/pendiente-";
const PLACEHOLDER_LOGO_EXTENSION = ".webp";

// Relación entre el valor original del CSV y el ID de categoría destino.
// Los IDs deben coincidir con las categorías de src/content/categories/.
const CATEGORY_MAP = {
  Accesorio: "accesorios",
  "Equipo Celular": "equipo-celular",
  "Router IFI": "router-ifi",
  "Router OLO": "router-olo",
  TFI: "tfi",
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toSlug(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDisplayName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Parser CSV ligero, sin dependencias externas.
 * Soporta:
 * - Separadores por coma.
 * - Campos entre comillas dobles.
 * - Comillas escapadas como "".
 * - Saltos de línea CRLF y LF.
 */
function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field.trim());
      field = "";

      if (row.some(Boolean)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

function readExistingBrands() {
  const brands = new Map();

  if (!fs.existsSync(BRANDS_DIR)) {
    return brands;
  }

  const files = fs
    .readdirSync(BRANDS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(BRANDS_DIR, file);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const fileSlug = path.basename(file, ".json");

      // Se indexa por filename y también por slug del nombre para tolerar
      // archivos creados antes con un slug diferente pero nombre equivalente.
      brands.set(fileSlug, { filePath, data });

      if (data.name) {
        brands.set(toSlug(data.name), { filePath, data });
      }
    } catch (error) {
      console.warn(
        `⚠️ No se pudo leer el JSON de marca "${filePath}": ${error.message}`,
      );
    }
  }

  return brands;
}

function groupCsvBrands() {
  const csvContent = fs.readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(csvContent);

  if (rows.length < 2) {
    throw new Error("El CSV no contiene encabezado y filas de datos suficientes.");
  }

  const [header, ...dataRows] = rows;
  const idIndex = header.findIndex((column) => column === "ID MARCA");
  const typeIndex = header.findIndex((column) => column === "TIPO PRODUCTO");
  const brandIndex = header.findIndex((column) => column === "MARCA");

  if (idIndex === -1 || typeIndex === -1 || brandIndex === -1) {
    throw new Error(
      `Encabezados inválidos. Se esperaban: "ID MARCA", "TIPO PRODUCTO", "MARCA". Recibidos: ${header.join(", ")}`,
    );
  }

  const groups = new Map();
  const unmappedTypes = new Set();
  const skippedRows = [];

  for (const row of dataRows) {
    const sourceId = normalizeText(row[idIndex]);
    const sourceType = normalizeText(row[typeIndex]);
    const sourceBrand = normalizeText(row[brandIndex]);

    if (!sourceBrand || !sourceType) {
      skippedRows.push(row);
      continue;
    }

    const categoryId = CATEGORY_MAP[sourceType];
    if (!categoryId) {
      unmappedTypes.add(sourceType);
      continue;
    }

    const slug = toSlug(sourceBrand);
    if (!slug) {
      skippedRows.push(row);
      continue;
    }

    if (!groups.has(slug)) {
      groups.set(slug, {
        slug,
        name: toDisplayName(sourceBrand),
        sourceIds: new Set(),
        sourceTypes: new Set(),
        categories: new Set(),
      });
    }

    const group = groups.get(slug);
    group.sourceIds.add(sourceId);
    group.sourceTypes.add(sourceType);
    group.categories.add(categoryId);
  }

  return { groups, unmappedTypes, skippedRows };
}

function hasSameCategories(current, next) {
  const currentNormalized = Array.isArray(current)
    ? [...new Set(current)].sort()
    : [];
  const nextNormalized = [...new Set(next)].sort();

  return JSON.stringify(currentNormalized) === JSON.stringify(nextNormalized);
}

function getPlaceholderLogo(slug) {
  return `${PLACEHOLDER_LOGO_PREFIX}${slug}${PLACEHOLDER_LOGO_EXTENSION}`;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `No se encontró el CSV: ${CSV_PATH}. Ajusta CSV_PATH al inicio del script o mueve el archivo a esa ubicación.`,
    );
  }

  const existingBrands = readExistingBrands();
  const { groups, unmappedTypes, skippedRows } = groupCsvBrands();

  if (groups.size === 0) {
    throw new Error("No se encontraron marcas válidas después de procesar el CSV.");
  }

  if (WRITE_MODE && !fs.existsSync(BRANDS_DIR)) {
    fs.mkdirSync(BRANDS_DIR, { recursive: true });
  }

  const summary = {
    created: 0,
    updated: 0,
    unchanged: 0,
  };

  console.log(
    `\n${WRITE_MODE ? "✍️ MODO ESCRITURA" : "🔎 MODO SIMULACIÓN"}` +
      ` — ${groups.size} marcas únicas detectadas.\n`,
  );

  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  for (const group of orderedGroups) {
    const existing = existingBrands.get(group.slug);
    const previous = existing?.data ?? {};
    const categories = [...group.categories].sort();
    const targetPath =
      existing?.filePath ?? path.join(BRANDS_DIR, `${group.slug}.json`);

    const isNew = !existing;

    // Para marcas existentes se preservan todos los campos actuales.
    // Para marcas nuevas se completan logo y website con datos demo válidos,
    // para que TinaCMS los muestre y el schema Zod no falle.
    const nextData = {
      ...previous,
      name: previous.name || group.name,
      logo: previous.logo ?? getPlaceholderLogo(group.slug),
      website: previous.website ?? PLACEHOLDER_WEBSITE,
      categories,
    };

    const categoriesChanged = !hasSameCategories(previous.categories, categories);
    const metadataChanged =
      isNew ||
      !previous.name ||
      !previous.logo ||
      !previous.website;
    const changed = categoriesChanged || metadataChanged;

    if (!changed) {
      summary.unchanged += 1;
      console.log(`  = ${group.slug}: sin cambios (${categories.join(", ")})`);
      continue;
    }

    if (isNew) {
      summary.created += 1;
      console.log(`  + ${group.slug}: crear`);
      console.log(`      categorías: ${categories.join(", ")}`);
      console.log(`      logo demo: ${nextData.logo}`);
      console.log(`      website demo: ${nextData.website}`);
    } else {
      summary.updated += 1;
      const previousCategories = Array.isArray(previous.categories)
        ? previous.categories.join(", ")
        : "(sin categorías)";
      console.log(`  ~ ${group.slug}: actualizar`);
      console.log(`      categorías: ${previousCategories} → ${categories.join(", ")}`);
    }

    if (WRITE_MODE) {
      fs.writeFileSync(targetPath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
    }
  }

  if (unmappedTypes.size > 0) {
    console.warn("\n⚠️ Tipos de producto encontrados en CSV sin mapeo:");
    for (const type of [...unmappedTypes].sort()) {
      console.warn(`  - ${type}`);
    }
    console.warn("Actualiza CATEGORY_MAP antes de ejecutar la migración real.");
  }

  if (skippedRows.length > 0) {
    console.warn(`\n⚠️ Filas omitidas por datos incompletos: ${skippedRows.length}`);
    for (const row of skippedRows.slice(0, 5)) {
      console.warn(`  - ${JSON.stringify(row)}`);
    }
    if (skippedRows.length > 5) {
      console.warn(`  ... y ${skippedRows.length - 5} fila(s) adicional(es).`);
    }
  }

  console.log("\nResumen:");
  console.log(`  Marcas creadas: ${summary.created}`);
  console.log(`  Marcas actualizadas: ${summary.updated}`);
  console.log(`  Marcas sin cambios: ${summary.unchanged}`);

  if (!WRITE_MODE) {
    console.log("\nNo se modificó ningún archivo (modo simulación).");
    console.log("Si el resultado es correcto, ejecuta:");
    console.log("  node scripts/migrate-brand-categories.mjs --write");
    return;
  }

  console.log("\n✅ Migración aplicada correctamente.");
  console.log("Siguientes pasos:");
  console.log("  1. Reemplaza los logos demo en TinaCMS.");
  console.log("  2. Reemplaza https://www.example.com por el sitio real de cada marca.");
  console.log("  3. Ejecuta: npm run generate:options");
  console.log("  4. Reinicia Astro/Tina: npm run dev");
}

try {
  main();
} catch (error) {
  console.error(`\n❌ Error durante la migración: ${error.message}`);
  process.exit(1);
}
