import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ROOT = process.cwd();

const PRODUCTS_DIR = path.join(ROOT, "src/content/products");
const BRANDS_DIR = path.join(ROOT, "src/content/brands");
const CATEGORIES_DIR = path.join(ROOT, "src/content/categories");
const LOCATIONS_DIR = path.join(ROOT, "src/content/locations");
const ACTIVATIONS_DIR = path.join(ROOT, "src/content/activations");

const WRITE_MODE = process.argv.includes("--write");

const stats = {
  products: 0,
  productBrands: 0,
  productCategories: 0,
  productLocations: 0,
  brands: 0,
  brandCategories: 0,
  activations: 0,
  activationLocations: 0,
  unchanged: 0,
};

const errors = [];

function referenceToId(value) {
  if (!value || typeof value !== "string") return "";

  const normalized = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");

  const filename = normalized.split("/").pop() ?? normalized;

  return filename.replace(/\.(json|md|mdx)$/i, "");
}

function brandReference(id) {
  return `src/content/brands/${id}.json`;
}

function categoryReference(id) {
  return `src/content/categories/${id}.json`;
}

function locationReference(id) {
  return `src/content/locations/${id}.md`;
}

function brandExists(id) {
  return fs.existsSync(path.join(BRANDS_DIR, `${id}.json`));
}

function categoryExists(id) {
  return fs.existsSync(path.join(CATEGORIES_DIR, `${id}.json`));
}

function locationExists(id) {
  return fs.existsSync(path.join(LOCATIONS_DIR, `${id}.md`));
}

function getFiles(dir, extensions) {
  return fs
    .readdirSync(dir)
    .filter((file) =>
      extensions.some((extension) => file.endsWith(extension)),
    )
    .sort();
}

function migrateProducts() {
  console.log("\n📦 PRODUCTOS");

  const files = getFiles(PRODUCTS_DIR, [".md", ".mdx"]);

  for (const file of files) {
    const filePath = path.join(PRODUCTS_DIR, file);
    const source = fs.readFileSync(filePath, "utf8");
    const parsed = matter(source);
    const data = parsed.data;

    stats.products += 1;

    let changed = false;

    // ── Brand ──────────────────────────────────────────
    const brandId = referenceToId(data.brand);

    if (!brandId || !brandExists(brandId)) {
      errors.push(
        `${file}: marca inexistente "${data.brand ?? ""}"`,
      );
    } else {
      const nextBrand = brandReference(brandId);

      if (data.brand !== nextBrand) {
        data.brand = nextBrand;
        stats.productBrands += 1;
        changed = true;
      }
    }

    // ── Category ───────────────────────────────────────
    const categoryId = referenceToId(data.category);

    if (!categoryId || !categoryExists(categoryId)) {
      errors.push(
        `${file}: categoría inexistente "${data.category ?? ""}"`,
      );
    } else {
      const nextCategory = categoryReference(categoryId);

      if (data.category !== nextCategory) {
        data.category = nextCategory;
        stats.productCategories += 1;
        changed = true;
      }
    }

    // ── Locations ─────────────────────────────────────
    if (Array.isArray(data.locations)) {
      data.locations = data.locations.map((item) => {
        const raw =
          typeof item === "string"
            ? item
            : item?.location;

        const locationId = referenceToId(raw);

        if (!locationId || !locationExists(locationId)) {
          errors.push(
            `${file}: sucursal inexistente "${raw ?? ""}"`,
          );

          return item;
        }

        const nextLocation = locationReference(locationId);

        if (
          typeof item === "string" ||
          item.location !== nextLocation
        ) {
          stats.productLocations += 1;
          changed = true;
        }

        return {
          ...(typeof item === "object" && item !== null ? item : {}),
          location: nextLocation,
        };
      });
    }

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    console.log(`  ~ ${file}`);

    if (WRITE_MODE) {
      fs.writeFileSync(
        filePath,
        matter.stringify(parsed.content, data),
        "utf8",
      );
    }
  }
}

function migrateBrands() {
  console.log("\n🏷️ MARCAS");

  const files = getFiles(BRANDS_DIR, [".json"]);

  for (const file of files) {
    const filePath = path.join(BRANDS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    stats.brands += 1;

    const current = Array.isArray(data.categories)
      ? data.categories
      : [];

    let changed = false;

    const nextCategories = current.map((item) => {
      const raw =
        typeof item === "string"
          ? item
          : item?.category;

      const categoryId = referenceToId(raw);

      if (!categoryId || !categoryExists(categoryId)) {
        errors.push(
          `${file}: categoría inexistente "${raw ?? ""}"`,
        );

        return item;
      }

      const nextReference = categoryReference(categoryId);

      if (
        typeof item === "string" ||
        item.category !== nextReference
      ) {
        stats.brandCategories += 1;
        changed = true;
      }

      return {
        ...(typeof item === "object" && item !== null ? item : {}),
        category: nextReference,
      };
    });

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    data.categories = nextCategories;

    console.log(`  ~ ${file}`);

    if (WRITE_MODE) {
      fs.writeFileSync(
        filePath,
        `${JSON.stringify(data, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

function migrateActivations() {
  console.log("\n📅 ACTIVACIONES");

  const files = getFiles(ACTIVATIONS_DIR, [".md", ".mdx"]);

  for (const file of files) {
    const filePath = path.join(ACTIVATIONS_DIR, file);
    const source = fs.readFileSync(filePath, "utf8");
    const parsed = matter(source);
    const data = parsed.data;

    stats.activations += 1;

    const current = Array.isArray(data.locations)
      ? data.locations
      : [];

    let changed = false;

    const nextLocations = current.map((item) => {
      const raw =
        typeof item === "string"
          ? item
          : item?.location;

      const locationId = referenceToId(raw);

      if (!locationId || !locationExists(locationId)) {
        errors.push(
          `${file}: sucursal inexistente "${raw ?? ""}"`,
        );

        return item;
      }

      const nextReference = locationReference(locationId);

      if (
        typeof item === "string" ||
        item.location !== nextReference
      ) {
        stats.activationLocations += 1;
        changed = true;
      }

      return {
        ...(typeof item === "object" && item !== null ? item : {}),
        location: nextReference,
      };
    });

    if (!changed) {
      stats.unchanged += 1;
      continue;
    }

    data.locations = nextLocations;

    console.log(`  ~ ${file}`);

    if (WRITE_MODE) {
      fs.writeFileSync(
        filePath,
        matter.stringify(parsed.content, data),
        "utf8",
      );
    }
  }
}

function printSummary() {
  console.log("\n────────────────────────────────────");
  console.log("RESUMEN");
  console.log("────────────────────────────────────");
  console.log(`Productos revisados:        ${stats.products}`);
  console.log(`Brands a migrar:            ${stats.productBrands}`);
  console.log(`Categorías a migrar:        ${stats.productCategories}`);
  console.log(`Sucursales de productos:    ${stats.productLocations}`);
  console.log(`Marcas revisadas:           ${stats.brands}`);
  console.log(`Categorías de marcas:       ${stats.brandCategories}`);
  console.log(`Activaciones revisadas:     ${stats.activations}`);
  console.log(`Sucursales de activaciones: ${stats.activationLocations}`);

  if (errors.length > 0) {
    console.error("\n❌ ERRORES DE VALIDACIÓN");

    for (const error of errors) {
      console.error(`  - ${error}`);
    }

    console.error(
      `\nNo ejecutes --write hasta resolver estos ${errors.length} error(es).`,
    );

    process.exitCode = 1;
    return;
  }

  console.log("\n✅ Todas las referencias apuntan a contenido existente.");

  if (!WRITE_MODE) {
    console.log("\n🔎 MODO SIMULACIÓN");
    console.log("No se modificó ningún archivo.");
    console.log(
      "Cuando validemos este resultado podremos ejecutar --write.",
    );
  } else {
    console.log("\n✍️ MIGRACIÓN APLICADA");
  }
}

console.log(
  WRITE_MODE
    ? "✍️ Migración Tina references — MODO ESCRITURA"
    : "🔎 Migración Tina references — MODO SIMULACIÓN",
);

migrateProducts();
migrateBrands();
migrateActivations();
printSummary();