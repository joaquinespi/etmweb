// src/content.config.ts  ← nueva ubicación
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

// ── SLIDERS ──────────────────────────────────────────────
const sliders = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/sliders" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().optional(),
    image: z.string(),
    imageAlt: z.string().optional(),
    order: z.number().default(0),
    active: z.boolean().default(true),
  }),
});

// ── BRANDS ──────────────────────────────────────────────
const brandsCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/brands" }),
  schema: z.object({
    name: z.string(),
    logo: z.string().optional(),
    website: z.string().url().optional(),
    // Una marca puede estar asociada a una o varias categorías.
    // Los valores deben coincidir con los IDs de src/content/categories/.
    // default([]) permite migrar las marcas existentes gradualmente.
    // categories: z.array(z.string()).min(1, "Toda marca debe pertenecer a una categoría"),
  }),
});

// ── CATEGORIES ──────────────────────────────────────────
const categoriesCollection = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/categories" }),
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    featuredImage: z.string().optional(),
    banner: z.string().optional(),
    slug: z.string().optional(),
  }),
});

// ── LOCATIONS (Sucursales) ───────────────────────────────
const locationsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/locations" }),
  schema: z.object({
    name: z.string(),
    image: z.string().optional(),
    district: z.string(),
    city: z.string().default("Lima"),
    address: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
    mapEmbedUrl: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
    wazeUrl: z.string().url().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    schedule: z.string(),
    isActive: z.boolean().default(true),
  }),
});

// ── ACTIVATIONS (Eventos) ────────────────────────────────
const activationsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/activations" }),
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    locations: z.array(z.string()),
    products: z.array(z.object({
      product: z.string(),
    })).optional(),
    banner: z.string().optional(),
    gallery: z.array(z.string()).default([]),
    isPublished: z.boolean().default(true),
  }),
});

// ── PRODUCTS ─────────────────────────────────────────────
const productsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    title: z.string(),
    shortDescription: z.string().optional(),
    availableColors: z.array(
      z.object({
        name: z.string(),
        hex: z.string(),
      })
    ).default([]),
    price: z.number(),
    salePrice: z.number().optional(),
    brand: z.string(),
    category: z.string(),
    locations: z.array(z.object({
      location: z.string(),
    })).default([]),  // ← default vacío si no existe
    mainImage: z.string().optional(),
    images: z.array(z.string()).default([]),  // ← sin .min(1), con default
    specs: z.array(z.object({
      key: z.string(),
      value: z.any(),
    })).default([]),  // ← sin .optional(), con default vacío
    inStock: z.boolean().default(true),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    publishedAt: z.coerce.date().optional(),
    stockQuantity: z.number().default(0),
    maxPerOrder: z.number().default(5),
  }),
});

export const collections = {
  products: productsCollection,
  categories: categoriesCollection,
  brands: brandsCollection,
  locations: locationsCollection,
  activations: activationsCollection,
  sliders,
};