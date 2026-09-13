// scripts/optimize-images.mjs
//
// Genera versiones WebP optimizadas de todas las imágenes subidas por
// TinaCMS (o el otro sistema) dentro de public/uploads/, incluyendo sus
// subcarpetas (products/, activaciones/, locations/, marcas/, etc.).
// No mueve ni modifica los originales — solo agrega variantes en
// public/uploads/optimized/, respetando la misma estructura de carpetas.
//
// Se salta las imágenes que ya tienen una versión optimizada más reciente
// que el original, para no reprocesar todo el catálogo en cada build.

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { IMAGE_VARIANTS } from "../src/utils/optimized-image-path.mjs";

const UPLOADS_DIR = "./public/uploads";
const OUTPUT_ROOT = path.join(UPLOADS_DIR, "optimized");
const OUTPUT_DIRNAME = "optimized"; // nombre de la carpeta a excluir del recorrido

const VALID_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isOptimizableImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return VALID_EXTENSIONS.includes(ext);
}

/**
 * Recorre UPLOADS_DIR recursivamente y devuelve la lista de imágenes
 * encontradas, con su ruta absoluta y su ruta relativa a UPLOADS_DIR
 * (para poder reconstruir la misma estructura de carpetas en la salida).
 */
function collectImages(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === OUTPUT_DIRNAME) continue; // no reprocesar la carpeta de salida

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectImages(fullPath, baseDir));
    } else if (entry.isFile() && isOptimizableImage(entry.name)) {
      const relativePath = path.relative(baseDir, fullPath);
      results.push({ fullPath, relativePath });
    }
  }

  return results;
}

async function needsProcessing(sourcePath, outputPath) {
  if (!fs.existsSync(outputPath)) return true;
  const sourceStat = fs.statSync(sourcePath);
  const outputStat = fs.statSync(outputPath);
  return sourceStat.mtimeMs > outputStat.mtimeMs;
}

async function optimizeImage(sourcePath, relativePath) {
  const relativeDir = path.dirname(relativePath); // ej: "products" o "." si está en la raíz
  const nameWithoutExt = path.parse(relativePath).name;
  const outputDir =
    relativeDir === "." ? OUTPUT_ROOT : path.join(OUTPUT_ROOT, relativeDir);

  fs.mkdirSync(outputDir, { recursive: true });

  let processedCount = 0;

  for (const [variantName, config] of Object.entries(IMAGE_VARIANTS)) {
    const outputFilename = `${nameWithoutExt}${config.suffix}.webp`;
    const outputPath = path.join(outputDir, outputFilename);

    if (!(await needsProcessing(sourcePath, outputPath))) {
      continue;
    }

    await sharp(sourcePath)
      .resize({ width: config.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath);

    processedCount++;
    const displayPath =
      relativeDir === "." ? outputFilename : `${relativeDir}/${outputFilename}`;
    console.log(`  ✅ ${displayPath} (${config.width}px)`);
  }

  return processedCount;
}

async function run() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log("⏭️ No existe public/uploads/, nada que optimizar.");
    return;
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  const images = collectImages(UPLOADS_DIR);

  if (images.length === 0) {
    console.log("⏭️ No hay imágenes para optimizar en public/uploads/.");
    return;
  }

  console.log(`🖼️  Optimizando imágenes (${images.length} encontradas, incluyendo subcarpetas)...`);

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const { fullPath, relativePath } of images) {
    console.log(`\n${relativePath}`);
    const processed = await optimizeImage(fullPath, relativePath);
    if (processed === 0) {
      console.log("  ⏭️ Ya estaba optimizada, se omite.");
      totalSkipped++;
    } else {
      totalProcessed++;
    }
  }

  console.log(
    `\n✨ Listo: ${totalProcessed} imagen(es) procesadas, ${totalSkipped} sin cambios.`,
  );
}

run().catch((err) => {
  console.error("❌ Error optimizando imágenes:", err);
  process.exit(1);
});
