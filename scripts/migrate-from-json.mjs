import fs from "fs";
import path from "path";
import { setTimeout as sleep } from "node:timers/promises";

// ── CONFIG ─────────────────────────────────────────────
const JSON_FILE   = "./scripts/product.json";
const IMAGES_DIR  = "./public/uploads/products";
const CONTENT_DIR = "./src/content/products";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// ───────────────────────────────────────────────────────

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(CONTENT_DIR, { recursive: true });

const CAT_MAP = { 15: "celulares", 32: "accesorios" };

const ACF_SPEC_MAP = {
  sistema_operativo:    "Sistema Operativo",
  tamano_pantalla:      "Tamaño de Pantalla",
  tipo_de_pantalla:     "Tipo de Pantalla",
  resolucion_pantalla:  "Resolución",
  camara_trasera_mp:    "Cámara Trasera",
  camara_frontal_mp:    "Cámara Frontal",
  memoria_interna_gb:   "Almacenamiento",
  ram:                  "RAM",
  nucleos:              "Núcleos",
  velocidad_ghz:        "Velocidad CPU",
  modelo_del_procesador:"Procesador",
  bateria_mah:          "Batería",
  peso_gramos:          "Peso (g)",
  alto_cm:              "Alto (cm)",
  ancho_cm:             "Ancho (cm)",
  grosor_cm:            "Grosor (cm)",
  bandas_2g:            "2G",
  bandas_3g:            "3G",
  bandas_4g:            "4G",
  soporte_5g:           "5G",
  wifi:                 "WiFi",
  bluetooth:            "Bluetooth",
  nfc:                  "NFC",
  sensor_de_huella:     "Sensor de Huella",
};

function extractImages(html) {
  const imgs = [];
  const re = /<img[^>]+src="(https?:\/\/expansiontecmye\.pe\/wp-content\/uploads\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!imgs.includes(m[1])) imgs.push(m[1]);
  }
  return imgs;
}

function parseSpecs(acf) {
  const specs = [];
  for (const [key, label] of Object.entries(ACF_SPEC_MAP)) {
    let val = acf[key];
    if (val === undefined || val === null || val === "" || val === "no") continue;
    if (typeof val === "boolean") { if (!val) continue; val = "Sí"; }
    const clean = String(val).replace(/<[^>]+>/g, "").trim();
    if (clean) specs.push({ key: label, value: clean });
  }
  return specs;
}

async function downloadImage(url, filename) {
  const dest = path.join(IMAGES_DIR, filename);
  if (fs.existsSync(dest)) { console.log(`  ↩ Ya existe: ${filename}`); return `/uploads/products/${filename}`; }
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "Connection": "close" } });
      if (!res.ok) { console.log(`  ✗ HTTP ${res.status}: ${filename}`); return null; }
      const buf = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buf));
      console.log(`  ✓ ${filename}`);
      await sleep(400);
      return `/uploads/products/${filename}`;
    } catch (e) {
      console.log(`  ⚠ Reintento ${i+1}/3: ${filename}`);
      await sleep(1500 * (i + 1));
    }
  }
  console.log(`  ✗ Falló definitivamente: ${filename}`);
  return null;
}

function escapeYaml(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ").trim();
}

async function migrate() {
  console.log("🚀 Leyendo productos desde JSON local...\n");
  const products = JSON.parse(fs.readFileSync(JSON_FILE, "utf-8"));
  console.log(`📦 ${products.length} productos encontrados\n`);

  for (const product of products) {
    const slug  = product.slug;
    const title = product.title.rendered;
    console.log(`\n→ ${title} (${slug})`);

    // Categoría
    const catId    = product.product_cat?.[0] ?? 0;
    const catSlug  = CAT_MAP[catId] ?? "sin-categoria";

    // Marca principal (primera)
    const marcas   = product.marcas ?? [];
    const brandSlug = marcas[0]?.slug ?? "sin-marca";

    // Sedes → locations
    const sedes = (product.acf?.sede_relacionada ?? []).map(s => ({
      location: `locations/${s.post_name}`,
    }));

    // Imágenes
    const remoteImgs = extractImages(product.content.rendered);
    const localImgs = [];
    for (let i = 0; i < remoteImgs.length; i++) {
      const ext      = path.extname(new URL(remoteImgs[i]).pathname) || ".png";
      const filename = `${slug}-${i + 1}${ext}`;
      const local    = await downloadImage(remoteImgs[i], filename);
      if (local) localImgs.push(local);
    }
    if (localImgs.length === 0) localImgs.push("/uploads/placeholder.webp");

    // Specs desde ACF
    const specs = parseSpecs(product.acf ?? {});

    // Stock
    const classList = Object.values(product.class_list ?? {}).join(" ");
    const inStock   = classList.includes("instock");
    const featured  = classList.includes("featured");

    // Excerpt como SEO description
    const seoDesc = (product.excerpt?.rendered ?? "")
      .replace(/<[^>]+>/g, "").trim();

    // Tags
    const tags = Object.values(product.class_list ?? {})
      .filter(c => c.startsWith("product_tag-"))
      .map(c => c.replace("product_tag-", ""));

    // Build MDX
    const imagesYaml = localImgs.map(i => `  - "${i}"`).join("\n");
    const specsYaml  = specs.length
      ? specs.map(s => `  - key: "${escapeYaml(s.key)}"\n    value: "${escapeYaml(s.value)}"`).join("\n")
      : "  - key: \"\"\n    value: \"\"";
    const locsYaml   = sedes.length
      ? sedes.map(s => `  - location: "${s.location}"`).join("\n")
      : "  []";
    const tagsYaml   = tags.length
      ? tags.map(t => `  - "${t}"`).join("\n")
      : "";

    const mdx = `---
title: "${escapeYaml(title)}"
price: 0
brand: "brands/${brandSlug}"
category: "categories/${catSlug}"
locations:
${locsYaml}
images:
${imagesYaml}
specs:
${specsYaml}
inStock: ${inStock}
featured: ${featured}
tags:
${tagsYaml}
seoTitle: "${escapeYaml(title)}"
seoDescription: "${escapeYaml(seoDesc)}"
publishedAt: "${product.date}"
---

`;

    const outPath = path.join(CONTENT_DIR, `${slug}.mdx`);
    fs.writeFileSync(outPath, mdx);
    console.log(`  ✓ Archivo: ${slug}.mdx`);
  }

  console.log("\n✅ Migración completada!");
  console.log("⚠️  Recuerda actualizar el campo 'price' en cada producto.");
}

migrate().catch(console.error);
