#!/usr/bin/env node
// scripts/generate-tina-options.mjs
// Genera opciones dinámicas para campos de marca y categoría en TinaCMS

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  brandsDir: path.join(__dirname, '../src/content/brands'),
  categoriesDir: path.join(__dirname, '../src/content/categories'),
  locationsDir: path.join(__dirname, '../src/content/locations'),
  outputFile: path.join(__dirname, '../tina/options.ts'),
};

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function generateBrandOptions() {
  const files = await fs.readdir(CONFIG.brandsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const options = [];

  for (const file of jsonFiles) {
    const id = file.replace('.json', '');
    const data = await readJsonFile(path.join(CONFIG.brandsDir, file));

    options.push({
      value: id,
      label: data?.name || id,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

async function generateCategoryOptions() {
  const files = await fs.readdir(CONFIG.categoriesDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const options = [];

  for (const file of jsonFiles) {
    const id = file.replace('.json', '');
    const data = await readJsonFile(path.join(CONFIG.categoriesDir, file));

    options.push({
      value: id,
      label: data?.name || id,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

async function generateLocationOptions() {
  const files = await fs.readdir(CONFIG.locationsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  const options = [];

  for (const file of mdFiles) {
    const id = file.replace('.md', '');
    // Para locations, usamos el filename como ID
    options.push({
      value: id,
      label: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

async function main() {
  console.log('🔧 Generando opciones para TinaCMS...\n');

  const [brandOptions, categoryOptions, locationOptions] = await Promise.all([
    generateBrandOptions(),
    generateCategoryOptions(),
    generateLocationOptions(),
  ]);

const content = `// ⚠️ AUTO-GENERADO por scripts/generate-tina-options.mjs
// NO EDITAR MANUALMENTE
// Ejecutar: npm run generate:options

export interface Option {
  value: string;
  label: string;
}

export const brandOptions: Option[] = ${JSON.stringify(brandOptions, null, 2)};

export const categoryOptions: Option[] = ${JSON.stringify(categoryOptions, null, 2)};

export const locationOptions: Option[] = ${JSON.stringify(locationOptions, null, 2)};

// Helper para obtener label por value
export const getBrandLabel = (value: string): string =>
  brandOptions.find(b => b.value === value)?.label || value;

export const getCategoryLabel = (value: string): string =>
  categoryOptions.find(c => c.value === value)?.label || value;

export const getLocationLabel = (value: string): string =>
  locationOptions.find(l => l.value === value)?.label || value;
`;

  await fs.writeFile(CONFIG.outputFile, content, 'utf-8');

  console.log(`✅ Opciones generadas:`);
  console.log(`   Marcas: ${brandOptions.length}`);
  console.log(`   Categorías: ${categoryOptions.length}`);
  console.log(`   Sucursales: ${locationOptions.length}`);
  console.log(`\n📁 Guardado en: tina/options.ts`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});