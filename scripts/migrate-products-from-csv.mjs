// scripts/migrate-products-from-csv.mjs
//
// Migra el CSV histórico de productos hacia archivos Markdown individuales
// en src/content/products/ y descarga las imágenes remotas a
// public/uploads/products/.
//
// Decisiones de migración:
// - Un producto Markdown por MARCA + MODELO + TIPO PRODUCTO.
// - Las variantes de color se consolidan en `availableColors`.
// - Las sucursales se consolidan en `locations` sin duplicados.
// - price: 0 para productos sin precio de origen.
// - inStock: true, según decisión de negocio para permitir su visualización.
// - featured: false por defecto.
// - Las imágenes se descargan desde RUTA CAPTURA a public/uploads/products/.
// - Las especificaciones se generan incluso cuando el CSV no tenga valor:
//   cada producto recibe todas las claves del modelo de especificaciones.
// - Modo simulación por defecto: no crea .md ni descarga imágenes.
// - Usa --write para aplicar cambios.
// - Usa --overwrite para sobrescribir .md que ya existan. Sin ese flag,
//   los archivos existentes no se modifican.
//
// Requisitos:
// - Node.js 20+ (usa fetch nativo).
// - PRODUCTOS.csv ubicado en la raíz del proyecto o ajustar CSV_PATH.
//
// Uso:
//   node scripts/migrate-products-from-csv.mjs
//   node scripts/migrate-products-from-csv.mjs --write
//   node scripts/migrate-products-from-csv.mjs --write --overwrite
//
// Scripts sugeridos para package.json:
//   "migrate:products": "node scripts/migrate-products-from-csv.mjs"
//   "migrate:products:write": "node scripts/migrate-products-from-csv.mjs --write"
//
// Después de migrar:
//   npm run generate:options
//   npm run generate:specs
//   npm run check
//   npm run dev

import fs from "node:fs";
import path from "node:path";

// ── Rutas ────────────────────────────────────────────────────────────────
const CSV_PATH = "./data/PRODUCTOS.csv";
const PRODUCTS_DIR = "./src/content/products";
const DOWNLOADS_DIR = "./public/uploads/products";

// ── Flags ────────────────────────────────────────────────────────────────
const WRITE_MODE = process.argv.includes("--write");
const OVERWRITE_MODE = process.argv.includes("--overwrite");

// ── Defaults de catálogo ─────────────────────────────────────────────────
const DEFAULT_PRICE = 0;
const DEFAULT_IN_STOCK = true;
const DEFAULT_FEATURED = false;
const DEFAULT_MAX_PER_ORDER = 5;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const DOWNLOAD_CONCURRENCY = 5;

// ── Mapeos de contenido ──────────────────────────────────────────────────
// Estos IDs deben coincidir con archivos reales en src/content/categories/.
const CATEGORY_MAP = {
  Accesorio: "accesorios",
  "Equipo Celular": "equipo-celular",
  "Router IFI": "router-ifi",
  "Router OLO": "router-olo",
  TFI: "tfi",
};

// Estos IDs deben coincidir con archivos reales de src/content/locations/.
// Ajusta los valores si tus archivos tienen nombres distintos.
const LOCATION_MAP = {
  CHOSICA: "pdv-chosica",
  CIENEGUILLA: "pdv-cieneguilla",
  LURIN: "pdv-lurin",
};

// Colores conocidos para crear availableColors con código hex cuando sea
// posible. Los no reconocidos se conservan y usan un gris neutro temporal.
const COLOR_HEX_MAP = {
  BLACK: "#000000",
  NEGRO: "#000000",
  "NEGRO MEDIANOCHE": "#111827",
  MIDNIGHT: "#111827",
  JETBLACK: "#111111",
  WHITE: "#FFFFFF",
  BLANCO: "#FFFFFF",
  STARLIGHT: "#F5F5DC",
  SILVER: "#C0C0C0",
  "MATTE SILVER": "#B8B8B8",
  GRIS: "#6B7280",
  "CLARO GRIS": "#D1D5DB",
  "PANTONE IMPENETRABLE (GRIS)": "#4B5563",
  AZUL: "#2563EB",
  BLUE: "#2563EB",
  "BLUE GRAY": "#64748B",
  "SKY BLUE": "#38BDF8",
  "DEEP BLUE": "#1E3A8A",
  RED: "#DC2626",
  ROJO: "#DC2626",
  VERDE: "#16A34A",
  "VERDE BOSQUE": "#166534",
  "CIAN OCEANO": "#0891B2",
  "DORADO AMANECER": "#D4A017",
  "DORADO DUNA": "#C9A66B",
  "DORADO PLATINO": "#C9A227",
  "COSMIC ORANGE": "#EA580C",
  "PANTONE BORDEAUX (ROSA)": "#881337",
  "AWESOME CHARCOAL": "#374151",
  "AWESOME NAVY": "#1E3A8A",
  "AWESOME GRAPHITE": "#374151",
  "LIGHT VIOLET": "#A78BFA",
  MOCA: "#8B5E3C",
  "ORO ROSA": "#B76E79",
  "LO ORO ROSA": "#B76E79",
  "CLARO MORADO": "#A855F7",
};

// Todas las especificaciones esperadas, incluso si el CSV no tiene dato.
// Se conservan en el orden del modelo Markdown entregado.
const SPEC_DEFINITIONS = [
  { key: "Sistema Operativo", source: "DETALLE TECNICO" },
  { key: "Tamaño de Pantalla", source: null },
  { key: "Tipo de Pantalla", source: null },
  { key: "Resolución", source: null },
  { key: "Cámara Trasera", source: null },
  { key: "Cámara Frontal", source: null },
  { key: "Almacenamiento", source: "MEMORIA INTERNA" },
  { key: "RAM", source: "MEMORIA RAM" },
  { key: "Núcleos", source: null },
  { key: "Velocidad CPU", source: null },
  { key: "Procesador", source: "TIPO PROCESADOR" },
  { key: "Batería", source: null },
  { key: "Peso (g)", source: null },
  { key: "Alto (cm)", source: null },
  { key: "Ancho (cm)", source: null },
  { key: "Grosor (cm)", source: null },
  { key: "2G", source: null },
  { key: "3G", source: null },
  { key: "4G", source: null },
  { key: "5G", source: null },
  { key: "WiFi", source: null },
  { key: "Bluetooth", source: "TIPO CONEXION" },
  { key: "NFC", source: null },
  { key: "Sensor de Huella", source: null },
  // Datos disponibles en el CSV que se preservan como specs complementarias.
  { key: "Tecnología", source: "TECNOLOGIA" },
  { key: "Tecnología SIM", source: "TECNOLOGIA SIM" },
  { key: "Detalle técnico", source: "DETALLE TECNICO" },
  { key: "Dispositivo destino", source: "DISPOSITIVO DESTINO" },
  { key: "Tipo de accesorio", source: "TIPO ACCESORIO" },
  { key: "Material", source: "MATERIA" },
  { key: "Voltaje", source: "VOLTAJE" },
  { key: "Tipo de conexión", source: "TIPO CONEXION" },
];

const REQUIRED_HEADERS = [
  "id_prod",
  "PUNTO DE VENTA",
  "TIPO PRODUCTO",
  "MARCA",
  "MODELO",
  "COLOR",
  "TECNOLOGIA",
  "MEMORIA INTERNA",
  "MEMORIA RAM",
  "TECNOLOGIA SIM",
  "TIPO PROCESADOR",
  "DETALLE TECNICO",
  "DISPOSITIVO DESTINO",
  "TIPO ACCESORIO",
  "MATERIA",
  "VOLTAJE",
  "TIPO CONEXION",
  "RUTA CAPTURA",
  "d_extension_captura",
];

// ── Utilidades de texto ──────────────────────────────────────────────────
function normalizeText(value) {
  const text = String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ");

  if (!text || text === "\\N" || text.toLowerCase() === "null") {
    return "";
  }

  return text;
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
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return "";

  return normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function toBrandId(value) {
  return toSlug(value);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(normalizeText(value));
}

function escapeYamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function yamlBlock(value, indent = "      ") {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  return normalized
    .split(/\r?\n/)
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

function getColorHex(colorName) {
  const normalized = normalizeText(colorName).toUpperCase();
  if (!normalized) return "#9CA3AF";
  return COLOR_HEX_MAP[normalized] ?? "#9CA3AF";
}

function splitTechnicalDetail(value) {
  return normalizeText(value);
}

// ── Parser CSV ───────────────────────────────────────────────────────────
// Parser propio para soportar comillas, comillas escapadas y CRLF sin añadir
// dependencias externas. PRODUCTOS.csv tiene filas repetidas, pero no requiere
// librería adicional para procesarlas correctamente.
function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field.trim());
      field = "";

      if (row.some((value) => value.length > 0)) {
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

function readCsvRecords() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(
      `No se encontró ${CSV_PATH}. Copia PRODUCTOS.csv en la raíz del proyecto o ajusta CSV_PATH.`,
    );
  }

  const content = fs.readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(content);

  if (rows.length < 2) {
    throw new Error("El CSV no contiene registros suficientes.");
  }

  const [headers, ...dataRows] = rows;
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Faltan encabezados requeridos: ${missingHeaders.join(", ")}.`,
    );
  }

  return dataRows.map((row, rowIndex) => {
    const record = { __rowNumber: rowIndex + 2 };
    headers.forEach((header, index) => {
      record[header] = normalizeText(row[index]);
    });
    return record;
  });
}

// ── Agrupación de productos ──────────────────────────────────────────────
// Identidad solicitada: agrupar colores de un mismo modelo en un solo .md.
// La clave usa tipo + marca + modelo para evitar mezclar productos homónimos
// de categorías distintas.
function groupProducts(records) {
  const groups = new Map();
  const unmappedCategories = new Set();
  const unmappedLocations = new Set();
  const invalidRecords = [];

  for (const record of records) {
    const sourceType = record["TIPO PRODUCTO"];
    const sourceBrand = record.MARCA;
    const sourceModel = record.MODELO;
    const category = CATEGORY_MAP[sourceType];

    if (!sourceType || !sourceBrand || !sourceModel) {
      invalidRecords.push({
        row: record.__rowNumber,
        reason: "Falta TIPO PRODUCTO, MARCA o MODELO",
      });
      continue;
    }

    if (!category) {
      unmappedCategories.add(sourceType);
      continue;
    }

    const brand = toBrandId(sourceBrand);
    const modelSlug = toSlug(sourceModel);
    const productSlug = toSlug(`${brand}-${modelSlug}`);

    if (!productSlug) {
      invalidRecords.push({
        row: record.__rowNumber,
        reason: "No se pudo generar slug",
      });
      continue;
    }

    if (!groups.has(productSlug)) {
      groups.set(productSlug, {
        slug: productSlug,
        title: `${toDisplayName(sourceBrand)} ${toDisplayName(sourceModel)}`.trim(),
        brand,
        category,
        sourceTypes: new Set(),
        sourceProductIds: new Set(),
        locations: new Set(),
        colors: new Map(),
        imageUrls: new Set(),
        records: [],
      });
    }

    const group = groups.get(productSlug);
    group.sourceTypes.add(sourceType);
    if (record.id_prod) group.sourceProductIds.add(record.id_prod);
    group.records.push(record);

    const sourceLocation = record["PUNTO DE VENTA"].toUpperCase();
    if (sourceLocation) {
      const locationId = LOCATION_MAP[sourceLocation];
      if (locationId) {
        group.locations.add(locationId);
      } else {
        unmappedLocations.add(sourceLocation);
      }
    }

    const colorName = record.COLOR;
    if (colorName) {
      const key = colorName.toUpperCase();
      if (!group.colors.has(key)) {
        group.colors.set(key, {
          name: toDisplayName(colorName),
          hex: getColorHex(colorName),
        });
      }
    }

    if (isHttpUrl(record["RUTA CAPTURA"])) {
      group.imageUrls.add(record["RUTA CAPTURA"]);
    }
  }

  return { groups, unmappedCategories, unmappedLocations, invalidRecords };
}

// ── Especificaciones ─────────────────────────────────────────────────────
function getFirstValue(records, sourceField) {
  if (!sourceField) return "";
  for (const record of records) {
    const value = normalizeText(record[sourceField]);
    if (value) return value;
  }
  return "";
}

function inferSpecValue(specKey, records) {
  const directDefinition = SPEC_DEFINITIONS.find((definition) => definition.key === specKey);
  const directValue = getFirstValue(records, directDefinition?.source);
  if (directValue) return directValue;

  const technology = getFirstValue(records, "TECNOLOGIA");
  const connection = getFirstValue(records, "TIPO CONEXION");
  const detail = splitTechnicalDetail(getFirstValue(records, "DETALLE TECNICO"));

  if (specKey === "4G" && /4g|lte/i.test(technology)) return technology;
  if (specKey === "5G" && /5g/i.test(technology)) return technology;
  if (specKey === "3G" && /3g/i.test(technology)) return technology;
  if (specKey === "2G" && /2g/i.test(technology)) return technology;
  if (specKey === "Bluetooth" && /bluetooth/i.test(connection)) return connection;
  if (specKey === "Batería" && /bater[ií]a|mah/i.test(detail)) return detail;

  return "";
}

function buildSpecs(records) {
  return SPEC_DEFINITIONS.map(({ key }) => ({
    key,
    value: inferSpecValue(key, records),
  }));
}

function buildTags(group) {
  const memory = getFirstValue(group.records, "MEMORIA INTERNA");
  const ram = getFirstValue(group.records, "MEMORIA RAM");
  const technology = getFirstValue(group.records, "TECNOLOGIA");

  return uniqueSorted([
    group.brand,
    group.category,
    toSlug(group.title),
    toSlug(memory),
    toSlug(ram),
    toSlug(technology),
  ]);
}

function buildShortDescription(group) {
  const technicalDetail = getFirstValue(group.records, "DETALLE TECNICO");
  const accessoryType = getFirstValue(group.records, "TIPO ACCESORIO");
  const technology = getFirstValue(group.records, "TECNOLOGIA");

  return technicalDetail || accessoryType || technology || "Información pendiente de completar.";
}

// ── Descarga de imágenes ─────────────────────────────────────────────────
function extensionFromUrl(url, fallback = ".jpg") {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
      return extension === ".jpeg" ? ".jpg" : extension;
    }
  } catch {
    // El URL ya se validó antes; se mantiene fallback como medida defensiva.
  }
  return fallback;
}

function imageFilename(productSlug, index, url) {
  const extension = extensionFromUrl(url);
  return `${productSlug}-${String(index + 1).padStart(2, "0")}${extension}`;
}

async function downloadImage(url, destinationPath) {
  if (fs.existsSync(destinationPath)) {
    return { status: "skipped", path: destinationPath };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ExpansionTecCatalogMigration/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Respuesta no es una imagen (${contentType || "sin content-type"})`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error("Imagen descargada vacía");
    }

    fs.writeFileSync(destinationPath, bytes);
    return { status: "downloaded", path: destinationPath };
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}

async function downloadProductImages(groups) {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }

  const tasks = [];

  for (const group of groups) {
    group.images = [];
    const urls = [...group.imageUrls].sort();

    urls.forEach((url, index) => {
      const filename = imageFilename(group.slug, index, url);
      const localPath = path.join(DOWNLOADS_DIR, filename);
      const publicPath = `/uploads/products/${filename}`;
      group.images.push(publicPath);

      tasks.push(async () => {
        try {
          const result = await downloadImage(url, localPath);
          return { ok: true, group: group.slug, url, publicPath, ...result };
        } catch (error) {
          return {
            ok: false,
            group: group.slug,
            url,
            publicPath,
            error: error.message,
          };
        }
      });
    });
  }

  if (tasks.length === 0) {
    return [];
  }

  console.log(`\n🖼️ Descargando ${tasks.length} imagen(es) con concurrencia ${DOWNLOAD_CONCURRENCY}...`);
  return runWithConcurrency(tasks, DOWNLOAD_CONCURRENCY);
}

// ── Serialización Markdown ───────────────────────────────────────────────
function renderProductMarkdown(group) {
  const locations = uniqueSorted([...group.locations]);
  const colors = [...group.colors.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
  const images = group.images ?? [];
  const specs = buildSpecs(group.records);
  const tags = buildTags(group);
  const shortDescription = buildShortDescription(group);
  const seoDescription = shortDescription;
  const publishedAt = new Date().toISOString();

  const lines = [
    "---",
    `title: ${escapeYamlString(group.title)}`,
    `shortDescription: ${escapeYamlString(shortDescription)}`,
    "availableColors:",
  ];

  if (colors.length > 0) {
    for (const color of colors) {
      lines.push(`  - name: ${escapeYamlString(color.name)}`);
      lines.push(`    hex: ${escapeYamlString(color.hex)}`);
    }
  } else {
    lines.push("  []");
  }

  lines.push(`price: ${DEFAULT_PRICE}`);
  lines.push(`brand: ${escapeYamlString(group.brand)}`);
  lines.push(`category: ${escapeYamlString(group.category)}`);
  lines.push("locations:");

  if (locations.length > 0) {
    for (const location of locations) {
      lines.push(`  - location: ${escapeYamlString(location)}`);
    }
  } else {
    lines.push("  []");
  }

  lines.push("images:");
  if (images.length > 0) {
    for (const image of images) {
      lines.push(`  - ${escapeYamlString(image)}`);
    }
  } else {
    lines.push("  []");
  }

  lines.push("specs:");
  for (const spec of specs) {
    lines.push(`  - key: ${escapeYamlString(spec.key)}`);
    lines.push("    value: |");
    // Valor vacío a propósito cuando el CSV no lo contiene. La clave siempre
    // aparece para cumplir con el modelo de especificaciones completo.
    lines.push(yamlBlock(spec.value, "      "));
  }

  lines.push(`inStock: ${DEFAULT_IN_STOCK}`);
  lines.push(`featured: ${DEFAULT_FEATURED}`);
  lines.push("tags:");
  if (tags.length > 0) {
    for (const tag of tags) {
      lines.push(`  - ${escapeYamlString(tag)}`);
    }
  } else {
    lines.push("  []");
  }

  lines.push(`seoTitle: ${escapeYamlString(group.title)}`);
  lines.push(`seoDescription: ${escapeYamlString(seoDescription)}`);
  lines.push(`publishedAt: ${publishedAt}`);
  lines.push("stockQuantity: 0");
  lines.push(`maxPerOrder: ${DEFAULT_MAX_PER_ORDER}`);
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

function writeProductFiles(groups) {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  }

  const summary = {
    created: 0,
    overwritten: 0,
    skippedExisting: 0,
  };

  for (const group of groups) {
    const filePath = path.join(PRODUCTS_DIR, `${group.slug}.md`);
    const exists = fs.existsSync(filePath);

    if (exists && !OVERWRITE_MODE) {
      summary.skippedExisting += 1;
      console.log(`  = ${group.slug}.md (ya existe; omitido)`);
      continue;
    }

    fs.writeFileSync(filePath, renderProductMarkdown(group), "utf8");

    if (exists) {
      summary.overwritten += 1;
      console.log(`  ~ ${group.slug}.md (sobrescrito)`);
    } else {
      summary.created += 1;
      console.log(`  + ${group.slug}.md (creado)`);
    }
  }

  return summary;
}

function printGroupPreview(groups, limit = 20) {
  console.log(`\nProductos únicos detectados: ${groups.length}`);
  console.log(`Mostrando ${Math.min(groups.length, limit)} producto(s):\n`);

  for (const group of groups.slice(0, limit)) {
    const colors = [...group.colors.values()].map((color) => color.name);
    const locations = [...group.locations];

    console.log(`  • ${group.slug}`);
    console.log(`    título: ${group.title}`);
    console.log(`    marca/categoría: ${group.brand} / ${group.category}`);
    console.log(`    colores: ${colors.join(", ") || "(sin dato)"}`);
    console.log(`    sucursales: ${locations.join(", ") || "(sin dato o no mapeadas)"}`);
    console.log(`    imágenes remotas: ${group.imageUrls.size}`);
  }

  if (groups.length > limit) {
    console.log(`\n  ... y ${groups.length - limit} producto(s) adicional(es).`);
  }
}

function printWarnings({ unmappedCategories, unmappedLocations, invalidRecords }) {
  if (unmappedCategories.size > 0) {
    console.warn("\n⚠️ Tipos de producto sin CATEGORY_MAP:");
    for (const value of [...unmappedCategories].sort()) {
      console.warn(`  - ${value}`);
    }
  }

  if (unmappedLocations.size > 0) {
    console.warn("\n⚠️ Puntos de venta sin LOCATION_MAP:");
    for (const value of [...unmappedLocations].sort()) {
      console.warn(`  - ${value}`);
    }
  }

  if (invalidRecords.length > 0) {
    console.warn(`\n⚠️ Filas inválidas/omitidas: ${invalidRecords.length}`);
    for (const issue of invalidRecords.slice(0, 10)) {
      console.warn(`  - Fila ${issue.row}: ${issue.reason}`);
    }
  }
}

async function main() {
  const records = readCsvRecords();
  const { groups, unmappedCategories, unmappedLocations, invalidRecords } =
    groupProducts(records);

  const orderedGroups = [...groups.values()].sort((a, b) =>
    a.title.localeCompare(b.title, "es"),
  );

  console.log(
    `\n${WRITE_MODE ? "✍️ MODO ESCRITURA" : "🔎 MODO SIMULACIÓN"}` +
      ` — filas CSV: ${records.length}.`,
  );

  printGroupPreview(orderedGroups);
  printWarnings({ unmappedCategories, unmappedLocations, invalidRecords });

  if (!WRITE_MODE) {
    console.log("\nNo se creó ningún .md ni se descargó ninguna imagen.");
    console.log("Si el preview es correcto, ejecuta:");
    console.log("  node scripts/migrate-products-from-csv.mjs --write");
    return;
  }

  const downloadResults = await downloadProductImages(orderedGroups);
  const failedDownloads = downloadResults.filter((result) => !result.ok);

  for (const failure of failedDownloads) {
    console.warn(
      `⚠️ Imagen no descargada (${failure.group}): ${failure.url} — ${failure.error}`,
    );
  }

  console.log("\n📝 Generando archivos Markdown...");
  const fileSummary = writeProductFiles(orderedGroups);

  console.log("\nResumen de migración:");
  console.log(`  Filas CSV procesadas: ${records.length}`);
  console.log(`  Productos únicos: ${orderedGroups.length}`);
  console.log(`  Archivos creados: ${fileSummary.created}`);
  console.log(`  Archivos sobrescritos: ${fileSummary.overwritten}`);
  console.log(`  Archivos existentes omitidos: ${fileSummary.skippedExisting}`);
  console.log(`  Imágenes descargadas: ${downloadResults.filter((result) => result.ok && result.status === "downloaded").length}`);
  console.log(`  Imágenes ya existentes: ${downloadResults.filter((result) => result.ok && result.status === "skipped").length}`);
  console.log(`  Descargas fallidas: ${failedDownloads.length}`);

  console.log("\n✅ Migración terminada.");
  console.log("\nSiguientes pasos:");
  console.log("  1. Revisa los .md en src/content/products/.");
  console.log("  2. Completa precios (price: 0) desde TinaCMS antes de vender.");
  console.log("  3. Ejecuta el pipeline de optimización para crear WebP/full/thumb.");
  console.log("  4. Ejecuta: npm run generate:options");
  console.log("  5. Ejecuta: npm run generate:specs");
  console.log("  6. Ejecuta: npm run check && npm run build");
}

main().catch((error) => {
  console.error(`\n❌ Error durante la migración de productos: ${error.message}`);
  process.exit(1);
});
