#!/usr/bin/env node
// scripts/generate-tina-options.mjs
//
// Genera opciones dinámicas para TinaCMS desde:
// - src/content/brands
// - src/content/categories
// - src/content/locations
//
// Uso:
// npm run generate:options
// npm run generate:options:watch

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
);

const CONFIG = {
  brandsDir: path.join(
    __dirname,
    "../src/content/brands",
  ),

  categoriesDir: path.join(
    __dirname,
    "../src/content/categories",
  ),

  locationsDir: path.join(
    __dirname,
    "../src/content/locations",
  ),

  outputFile: path.join(
    __dirname,
    "../tina/options.ts",
  ),
};

const WATCH_MODE =
  process.argv.includes("--watch");

let generating = false;
let regenerateTimer = null;


// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(
      filePath,
      "utf-8",
    );

    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `⚠️ No se pudo leer: ${filePath}`,
    );

    return null;
  }
}


// ─────────────────────────────────────────────
// MARCAS
// ─────────────────────────────────────────────

async function generateBrandOptions() {
  const files = await fs.readdir(
    CONFIG.brandsDir,
  );

  const jsonFiles = files.filter(
    (file) => file.endsWith(".json"),
  );

  const options = [];

  for (const file of jsonFiles) {
    const id = file.replace(/\.json$/, "");

    const data = await readJsonFile(
      path.join(CONFIG.brandsDir, file),
    );

    if (!data) continue;

    options.push({
      value: id,
      label: data.name || id,
    });
  }

  return options.sort((a, b) =>
    a.label.localeCompare(
      b.label,
      "es",
      {
        sensitivity: "base",
      },
    ),
  );
}


// ─────────────────────────────────────────────
// CATEGORÍAS
// ─────────────────────────────────────────────

async function generateCategoryOptions() {
  const files = await fs.readdir(
    CONFIG.categoriesDir,
  );

  const jsonFiles = files.filter(
    (file) => file.endsWith(".json"),
  );

  const options = [];

  for (const file of jsonFiles) {
    const id = file.replace(/\.json$/, "");

    const data = await readJsonFile(
      path.join(CONFIG.categoriesDir, file),
    );

    if (!data) continue;

    options.push({
      value: id,
      label: data.name || id,
    });
  }

  return options.sort((a, b) =>
    a.label.localeCompare(
      b.label,
      "es",
      {
        sensitivity: "base",
      },
    ),
  );
}


// ─────────────────────────────────────────────
// SUCURSALES
// ─────────────────────────────────────────────

async function generateLocationOptions() {
  const files = await fs.readdir(
    CONFIG.locationsDir,
  );

  const mdFiles = files.filter(
    (file) => file.endsWith(".md"),
  );

  const options = [];

  for (const file of mdFiles) {
    const id = file.replace(/\.md$/, "");

    options.push({
      value: id,

      label: id
        .replace(/-/g, " ")
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase(),
        ),
    });
  }

  return options.sort((a, b) =>
    a.label.localeCompare(
      b.label,
      "es",
      {
        sensitivity: "base",
      },
    ),
  );
}


// ─────────────────────────────────────────────
// GENERADOR
// ─────────────────────────────────────────────

async function generateOptions() {
  if (generating) return;

  generating = true;

  try {
    const [
      brandOptions,
      categoryOptions,
      locationOptions,
    ] = await Promise.all([
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

export const brandOptions: Option[] = ${JSON.stringify(
      brandOptions,
      null,
      2,
    )};

export const categoryOptions: Option[] = ${JSON.stringify(
      categoryOptions,
      null,
      2,
    )};

export const locationOptions: Option[] = ${JSON.stringify(
      locationOptions,
      null,
      2,
    )};

export const getBrandLabel = (
  value: string,
): string =>
  brandOptions.find(
    (brand) => brand.value === value,
  )?.label || value;

export const getCategoryLabel = (
  value: string,
): string =>
  categoryOptions.find(
    (category) => category.value === value,
  )?.label || value;

export const getLocationLabel = (
  value: string,
): string =>
  locationOptions.find(
    (location) => location.value === value,
  )?.label || value;
`;

    const currentContent =
      await fs
        .readFile(
          CONFIG.outputFile,
          "utf-8",
        )
        .catch(() => null);

    // Evitamos escribir el archivo si
    // realmente no cambió nada.
    if (currentContent !== content) {
      await fs.writeFile(
        CONFIG.outputFile,
        content,
        "utf-8",
      );

      console.log(
        "\n🔄 tina/options.ts actualizado",
      );
    }

    console.log(
      `   Marcas: ${brandOptions.length}`,
    );

    console.log(
      `   Categorías: ${categoryOptions.length}`,
    );

    console.log(
      `   Sucursales: ${locationOptions.length}`,
    );
  } catch (error) {
    console.error(
      "❌ Error generando opciones:",
      error,
    );
  } finally {
    generating = false;
  }
}


// ─────────────────────────────────────────────
// DEBOUNCE
// ─────────────────────────────────────────────

function scheduleRegeneration(
  eventType,
  filename,
) {
  if (regenerateTimer) {
    clearTimeout(regenerateTimer);
  }

  regenerateTimer = setTimeout(
    async () => {
      console.log(
        `\n👀 Cambio detectado: ${eventType} ${filename || ""}`,
      );

      await generateOptions();
    },
    300,
  );
}


// ─────────────────────────────────────────────
// WATCH
// ─────────────────────────────────────────────

function watchDirectory(directory) {
  const watcher = fsSync.watch(
    directory,
    {
      persistent: true,
    },
    (eventType, filename) => {
      scheduleRegeneration(
        eventType,
        filename,
      );
    },
  );

  watcher.on("error", (error) => {
    console.error(
      `❌ Error observando ${directory}:`,
      error,
    );
  });

  return watcher;
}


// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log(
    "🔧 Generando opciones para TinaCMS...",
  );

  await generateOptions();

  if (!WATCH_MODE) {
    console.log(
      "\n✅ Generación finalizada.",
    );

    return;
  }

  console.log(
    "\n👀 Observando cambios en:",
  );

  console.log(
    "   src/content/brands",
  );

  console.log(
    "   src/content/categories",
  );

  console.log(
    "   src/content/locations",
  );

  console.log(
    "\nPresiona Ctrl+C para detener.\n",
  );

  watchDirectory(CONFIG.brandsDir);
  watchDirectory(CONFIG.categoriesDir);
  watchDirectory(CONFIG.locationsDir);
}

main().catch((error) => {
  console.error(
    "❌ Error:",
    error,
  );

  process.exit(1);
});