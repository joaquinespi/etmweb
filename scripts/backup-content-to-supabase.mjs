/**
 * backup-content-to-supabase.mjs
 * --------------------------------
 * Lee TODO el contenido de src/content/ y lo sube (upsert)
 * a Supabase. Idempotente: correrlo N veces no duplica.
 *
 * Uso:
 *   1. cp .env.example .env  →  rellenar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   2. npm run backup:content
 *
 * Tablas destino (definidas en supabase/schema.sql):
 *   brands, categories, sliders, locations, activations, products
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

// ---------- Cargar .env sin librerías extra ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  console.error('   cp .env.example .env  y rellena las variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const CONTENT_DIR = path.join(ROOT, 'src', 'content');

// ---------- Helpers ----------
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function readMd(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  return matter(raw); // { data, content, ... }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.json'))
    .map((f) => ({
      slug: f.replace(/\.(md|json)$/i, ''),
      full: path.join(dir, f),
    }));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertAll(table, rows, label) {
  if (rows.length === 0) {
    console.log(`   (vacío) ${label}`);
    return;
  }
  console.log(`   ${rows.length} registros → ${table}`);
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false });
    if (error) {
      console.error(`   ❌ Error en ${table}:`, error.message);
      throw error;
    }
  }
  console.log(`   ✅ ${table} OK`);
}

// ---------- Brands ----------
async function backupBrands() {
  const dir = path.join(CONTENT_DIR, 'brands');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const data = readJson(full);
    return {
      slug,
      name: data.name,
      logo: data.logo,
      website: data.website,
      raw: data,
    };
  });
  await upsertAll('brands', rows, 'brands');
}

// ---------- Categories ----------
async function backupCategories() {
  const dir = path.join(CONTENT_DIR, 'categories');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const data = readJson(full);
    return {
      slug,
      name: data.name,
      description: data.description,
      image: data.image,
      featuredimage: data.featuredImage,
      banner: data.banner,
      raw: data,
    };
  });
  await upsertAll('categories', rows, 'categories');
}

// ---------- Sliders ----------
async function backupSliders() {
  const dir = path.join(CONTENT_DIR, 'sliders');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const data = readJson(full);
    return {
      slug,
      title: data.title,
      subtitle: data.subtitle,
      ctalabel: data.ctaLabel,
      ctaurl: data.ctaUrl,
      image: data.image,
      imagealt: data.imageAlt,
      order: typeof data.order === 'number' ? data.order : 0,
      active: data.active !== false,
      raw: data,
    };
  });
  await upsertAll('sliders', rows, 'sliders');
}

// ---------- Locations ----------
async function backupLocations() {
  const dir = path.join(CONTENT_DIR, 'locations');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const { data, content } = readMd(full);
    return {
      slug,
      name: data.name,
      image: data.image,
      district: data.district,
      city: data.city,
      address: data.address,
      phone: data.phone,
      email: data.email,
      lat: data.coordinates?.lat ?? null,
      lng: data.coordinates?.lng ?? null,
      schedule: data.schedule,
      mapembedurl: data.mapEmbedUrl,
      googlemapsurl: data.googleMapsUrl,
      wazeurl: data.wazeUrl,
      isactive: data.isActive !== false,
      body: content?.trim() || null,
      raw: { ...data, body: content },
    };
  });
  await upsertAll('locations', rows, 'locations');
}

// ---------- Activations ----------
async function backupActivations() {
  const dir = path.join(CONTENT_DIR, 'activations');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const { data, content } = readMd(full);
    return {
      slug,
      title: data.title,
      startdate: data.startDate,
      enddate: data.endDate,
      locations: Array.isArray(data.locations) ? data.locations : [],
      products: Array.isArray(data.products) ? data.products : [],
      banner: data.banner,
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      ispublished: data.isPublished === true,
      body: content?.trim() || null,
      raw: { ...data, body: content },
    };
  });
  await upsertAll('activations', rows, 'activations');
}

// ---------- Products ----------
async function backupProducts() {
  const dir = path.join(CONTENT_DIR, 'products');
  const files = listFiles(dir);
  const rows = files.map(({ slug, full }) => {
    const { data, content } = readMd(full);
    return {
      slug,
      title: data.title,
      shortdescription: data.shortDescription,
      availablecolors: Array.isArray(data.availableColors) ? data.availableColors : [],
      price: data.price ?? null,
      saleprice: data.salePrice ?? null,
      brand: data.brand,
      category: data.category,
      locations: Array.isArray(data.locations) ? data.locations : [],
      mainimage: data.mainImage,
      images: Array.isArray(data.images) ? data.images : [],
      specs: Array.isArray(data.specs) ? data.specs : [],
      instock: data.inStock !== false,
      featured: data.featured === true,
      tags: Array.isArray(data.tags) ? data.tags : [],
      seotitle: data.seoTitle,
      seodescription: data.seoDescription,
      publishedat: data.publishedAt,
      body: content?.trim() || null,
      raw: { ...data, body: content },
    };
  });
  await upsertAll('products', rows, 'products');
}

// ---------- main ----------
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const t0 = Date.now();
  console.log('\n🚀 Backup TinaCMS → Supabase');
  console.log('━'.repeat(50));

  await backupBrands();
  await backupCategories();
  await backupSliders();
  await backupLocations();
  await backupActivations();
  await backupProducts();

  const ms = ((Date.now() - t0) / 1000).toFixed(2);
  console.log('━'.repeat(50));
  console.log(`✨ Listo en ${ms}s. Verifica en Supabase → Table Editor.\n`);
}

main().catch((err) => {
  console.error('\n💥 Backup falló:', err.message || err);
  process.exit(1);
});