import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";
import { setTimeout as sleep } from "node:timers/promises";

// ── CONFIGURACIÓN ──────────────────────────────────────
const WC_URL      = "https://expansiontecmye.pe";
const WC_KEY      = "ck_678aa6457cc3b905d2d983531feb956e24c7c41f";   // ← pega tu consumer key
const WC_SECRET   = "cs_0256f36d71dee534bc2948f7c5cd80b45dacd822";   // ← pega tu consumer secret
const IMAGES_DIR  = "./public/uploads/products";
const CONTENT_DIR = "./src/content/products";
// ───────────────────────────────────────────────────────

// Crear directorios si no existen
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(CONTENT_DIR, { recursive: true });

// Helper: fetch con autenticación básica WooCommerce
async function wcFetch(endpoint) {
  const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64");
  const url  = `${WC_URL}/wp-json/wc/v3${endpoint}`;
  const res  = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status}: ${url}`);
  return res.json();
}

// Helper: descargar imagen
async function downloadImage(imageUrl, filename) {
  const dest = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(dest)) {
    console.log(`  ↩ Ya existe: ${filename}`);
    return `/uploads/products/${filename}`;
  }

  try {
    const res = await fetchWithRetry(imageUrl);
    if (!res.ok) {
      console.log(`  ✗ Error ${res.status} descargando: ${filename}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buf));
    console.log(`  ✓ Imagen: ${filename}`);
    // Pequeña pausa entre descargas para no saturar el servidor
    await sleep(300);
    return `/uploads/products/${filename}`;
  } catch (err) {
    console.log(`  ✗ Falló descarga de ${filename}: ${err.message}`);
    return null;
  }
}

// Helper: slugify
function slugify(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Helper: parsear specs desde ACF o meta
function parseSpecs(product) {
  const specs = [];
  // ACF fields (ajusta los nombres según tus campos)
  const acf = product.meta_data ?? [];
  const acfMap = {
    "pa_marca":      "Marca",
    "pa_modelo":     "Modelo",
    "pa_procesador": "Procesador",
    "pa_ram":        "RAM",
    "pa_almacenamiento": "Almacenamiento",
    "pa_pantalla":   "Pantalla",
    "pa_bateria":    "Batería",
    "pa_sistema":    "Sistema Operativo",
  };

  for (const meta of acf) {
    const label = acfMap[meta.key];
    if (label && meta.value) {
      specs.push({ key: label, value: String(meta.value) });
    }
  }

  // Si viene de atributos de WooCommerce
  for (const attr of product.attributes ?? []) {
    if (attr.visible && attr.options?.length > 0) {
      specs.push({ key: attr.name, value: attr.options.join(", ") });
    }
  }

  return specs;
}

// Helper: fetch con reintentos
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        // Fuerza HTTP/1.1 para evitar problemas SSL con algunos servidores WordPress
        headers: {
          ...options.headers,
          "Connection": "close",
        },
      });
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  ⚠ Reintento ${i + 1}/${retries} para: ${url}`);
      await sleep(1500 * (i + 1)); // espera 1.5s, 3s, 4.5s
    }
  }
}

// ── MIGRACIÓN PRINCIPAL ────────────────────────────────
async function migrate() {
  console.log("🚀 Iniciando migración desde WooCommerce...\n");

  // 1. Obtener categorías primero
  const wooCategories = await wcFetch("/products/categories?per_page=50");
  const catMap = {};
  for (const cat of wooCategories) {
    catMap[cat.id] = slugify(cat.slug || cat.name);
  }
  console.log(`📂 ${wooCategories.length} categorías encontradas\n`);

  // 2. Obtener todos los productos
  let page = 1;
  let allProducts = [];
  while (true) {
    const batch = await wcFetch(`/products?per_page=50&page=${page}&status=publish`);
    if (batch.length === 0) break;
    allProducts = [...allProducts, ...batch];
    page++;
  }
  console.log(`📦 ${allProducts.length} productos encontrados\n`);

  // 3. Procesar cada producto
  for (const product of allProducts) {
    const slug = product.slug || slugify(product.name);
    console.log(`\n→ Procesando: ${product.name} (${slug})`);

    // Descargar imágenes
    const images = [];
    for (const img of product.images ?? []) {
      const ext      = path.extname(new URL(img.src).pathname) || ".jpg";
      const filename = `${slug}-${images.length + 1}${ext}`;
      const localUrl = await downloadImage(img.src, filename);
      if (localUrl) images.push(localUrl);  // ← solo agrega si descargó bien
    }

    // Categoría principal
    const firstCat    = product.categories?.[0];
    const categoryRef = firstCat ? catMap[firstCat.id] ?? "sin-categoria" : "sin-categoria";

    // Specs
    const specs = parseSpecs(product);

    // Precio
    const price     = parseFloat(product.regular_price || product.price || "0");
    const salePrice = product.sale_price ? parseFloat(product.sale_price) : undefined;

    // Construir el frontmatter del MDX
    const frontmatter = {
      title:          product.name,
      price,
      ...(salePrice ? { salePrice } : {}),
      brand:          "brands/sin-marca",      // ajusta si tienes marca en meta
      category:       `categories/${categoryRef}`,
      locations:      [],
      images:         images.length > 0 ? images : ["/uploads/placeholder.webp"],
      specs,
      inStock:        product.stock_status === "instock",
      featured:       product.featured,
      tags:           product.tags?.map((t) => t.name) ?? [],
      seoTitle:       product.yoast_head_json?.title ?? product.name,
      seoDescription: product.yoast_head_json?.description ?? product.short_description?.replace(/<[^>]+>/g, "").trim() ?? "",
      publishedAt:    product.date_created ?? new Date().toISOString(),
    };

    // Contenido (descripción larga)
    const description = product.description
      ?.replace(/<[^>]+>/g, "")
      .trim() ?? "";

    // Escribir archivo MDX
    const mdxContent = `---
${Object.entries(frontmatter)
  .map(([k, v]) => {
    if (Array.isArray(v)) {
      if (v.length === 0) return `${k}: []`;
      if (typeof v[0] === "object") {
        return `${k}:\n${v.map(item =>
          `  - ${Object.entries(item).map(([ik, iv]) => `${ik}: "${iv}"`).join("\n    ")}`
        ).join("\n")}`;
      }
      return `${k}:\n${v.map(i => `  - "${i}"`).join("\n")}`;
    }
    if (typeof v === "boolean") return `${k}: ${v}`;
    if (typeof v === "number")  return `${k}: ${v}`;
    return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
  })
  .join("\n")}
---

${description}
`;

    const outputPath = path.join(CONTENT_DIR, `${slug}.mdx`);
    fs.writeFileSync(outputPath, mdxContent);
    console.log(`  ✓ Archivo: ${slug}.md`);
  }

  console.log("\n✅ Migración completada!");
  console.log(`   - Productos: ${allProducts.length} archivos en ${CONTENT_DIR}`);
  console.log(`   - Imágenes:  en ${IMAGES_DIR}`);
  console.log("\n⚠️  Revisa brand y locations en cada producto antes de hacer commit.");
}

migrate().catch(console.error);