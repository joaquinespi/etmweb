// tina/config.ts
import { defineConfig } from "tinacms";
import { slidersCollection } from "./collections/sliders";
import { brandOptions, categoryOptions, locationOptions } from "./options";

export default defineConfig({
  branch: "main",
  clientId: process.env.TINA_CLIENT_ID ?? "",
  token: process.env.TINA_TOKEN ?? "",

  search: {
    tina: {
      indexerToken: process.env.TINA_SEARCH_TOKEN ?? "",
      stopwordLanguages: ["spa"],
    },
    indexBatchSize: 50,
    maxSearchIndexFieldLength: 200,
  },

  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
  },

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },

  schema: {
    collections: [

      // ── SLIDERS ──────────────────────────────────────
      slidersCollection,

      // ── BRANDS ──────────────────────────────────────
      {
        name: "brands",
        label: "Marcas",
        path: "src/content/brands",
        format: "json",
        ui: {
          filename: {
            readonly: false,
            slugify: (val) => val.toLowerCase().replace(/\s+/g, '-'),
          },
        },
        fields: [
          { type: "string", name: "name", label: "Nombre", required: true, searchable: true, isTitle: true },
          { type: "image", name: "logo", label: "Logo" },
          { type: "string", name: "website", label: "Sitio web", searchable: false },
          {
            type: "string",
            name: "categories", // Lo cambiamos a plural para ser consistentes
            label: "Categorías",
            list: true, // ✅ Esto permite agregar múltiples sucursales
            options: categoryOptions,
            required: true,
          },
        ],
      },

      // ── CATEGORIES ──────────────────────────────────
      {
        name: "categories",
        label: "Categorías",
        path: "src/content/categories",
        format: "json",
        ui: {
          filename: {
            readonly: false,
          },
        },
        fields: [
          { type: "string", name: "name", label: "Nombre", required: true, isTitle: true },
          {
            type: "string",
            name: "slug",
            label: "Slug (ID)",
            required: true,
            description: "Debe coincidir con el nombre del archivo (ej: celulares)"
          },
          { type: "string", name: "description", label: "Descripción", searchable: true },
          { type: "image", name: "image", label: "Imagen", searchable: false },
          { type: "image", name: "featuredImage", label: "Imagen destacada (card grande)", searchable: false },
          { type: "image", name: "banner", label: "Banner (cabecera de página)", searchable: false },
        ],
      },

      // ── LOCATIONS ───────────────────────────────────
      {
        name: "locations",
        label: "Sucursales",
        path: "src/content/locations",
        format: "md",
        ui: {
          filename: {
            readonly: false,
          },
        },
        fields: [
          { type: "string", name: "name", label: "Nombre", required: true, searchable: true, isTitle: true },
          { type: "image", name: "image", label: "Foto de la tienda" },
          { type: "string", name: "district", label: "Distrito", required: true, searchable: true },
          { type: "string", name: "city", label: "Ciudad", searchable: true },
          { type: "string", name: "address", label: "Dirección", required: true, searchable: true },
          { type: "string", name: "phone", label: "Teléfono", required: true, searchable: false },
          { type: "string", name: "email", label: "Email", searchable: false },
          {
            type: "object",
            name: "coordinates",
            label: "Coordenadas",
            fields: [
              { type: "number", name: "lat", label: "Latitud", required: true },
              { type: "number", name: "lng", label: "Longitud", required: true },
            ],
          },
          { type: "string", name: "schedule", label: "Horario" },
          { type: "string", name: "mapEmbedUrl", label: "Link de Mapa (Embed)", ui: { description: "El src del iframe de Google Maps" } }, // <--- Faltaba
          { type: "string", name: "googleMapsUrl", label: "URL Google Maps" }, // <--- Faltaba
          { type: "string", name: "wazeUrl", label: "URL Waze" }, // <--- Faltaba
          { type: "boolean", name: "isActive", label: "Activa" },
          { type: "rich-text", name: "body", label: "Descripción", isBody: true },
        ],
      },

      // ── ACTIVATIONS ─────────────────────────────────
      {
        name: "activations",
        label: "Activaciones",
        path: "src/content/activations",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Título", required: true, searchable: true },
          { type: "datetime", name: "startDate", label: "Fecha inicio", required: true },
          { type: "datetime", name: "endDate", label: "Fecha fin", required: true },
          {
            type: "string",
            name: "locations", // Lo cambiamos a plural para ser consistentes
            label: "Sucursales",
            list: true, // ✅ Esto permite agregar múltiples sucursales
            options: locationOptions,
            required: true,
          },
          {
            type: "object",
            name: "products",
            label: "Productos vinculados",
            list: true,
            fields: [
              {
                type: "string",
                name: "product",
                label: "Producto",
                options: [], // Se llena dinámicamente o se usa búsqueda
              },
            ],
          },
          { type: "image", name: "banner", label: "Banner" },
          { type: "image", name: "gallery", label: "Galería", list: true },
          { type: "boolean", name: "isPublished", label: "Publicado" },
          { type: "rich-text", name: "body", label: "Descripción", isBody: true },
        ],
      },

      // ── PRODUCTS ────────────────────────────────────
      {
        name: "products",
        label: "Productos",
        path: "src/content/products",
        format: "md",
        ui: {
          previewSrc: (values) => Array.isArray(values?.images) ? values.images[0] ?? "" : "",
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Nombre del producto",
            required: true,
            searchable: true,
            isTitle: true,
          },
          {
            type: "string",
            name: "shortDescription",
            label: "Descripción corta",
            ui: { component: "textarea" },
            searchable: true
          },
          {
            type: "object",
            name: "availableColors",
            label: "Colores disponibles",
            list: true,
            ui: {
              itemProps: (item) => ({
                label: item?.name || item?.hex || "Nuevo color",
              }),
            },
            fields: [
              {
                type: "string",
                name: "name",
                label: "Nombre del color",
              },
              {
                type: "string",
                name: "hex",
                label: "Color",
                ui: {
                  component: "color",
                  colorFormat: "hex",
                },
              },
            ],
          },
          {
            type: "number",
            name: "price",
            label: "Precio",
            required: true,
          },
          {
            type: "number",
            name: "salePrice",
            label: "Precio oferta",
          },
          // ✅ CAMBIO: reference → string con options
          {
            type: "string",
            name: "brand",
            label: "Marca",
            options: brandOptions,
            required: true,
            searchable: true,
          },
          // ✅ CAMBIO: reference → string con options
          {
            type: "string",
            name: "category",
            label: "Categoría",
            options: categoryOptions,
            required: true,
            searchable: true,
          },
          // ✅ CAMBIO: reference → string con options
          {
            type: "object",
            name: "locations",
            label: "Sucursales disponibles",
            list: true,
            ui: {
              itemProps: (item) => {
                return {
                  label: item?.location || "Sucursal",
                };
              },
            },
            fields: [
              {
                type: "string",
                name: "location",
                label: "Sucursal",
                options: locationOptions,
              },
            ],
            searchable: true,
          },
          {
            type: "image",
            name: "mainImage",
            label: "Imagen principal",
            ui: {
              clearable: true,
              format(value) {
                return value?.startsWith("/") ? value : `/${value}`;
              },
              parse(value) {
                return value?.startsWith("/") ? value.slice(1) : value;
              },
            },
          },
          {
            type: "image",
            name: "images",
            label: "Imágenes",
            list: true,
          },
          {
            type: "object",
            name: "specs",
            label: "Especificaciones técnicas",
            list: true,
            ui: {
              itemProps: (item) => {
                return {
                  label: item?.key || "Nueva especificación",
                };
              },
            },
            fields: [
              { type: "string", name: "key", label: "Título" },
              { type: "rich-text", name: "value", label: "Descripción" },
            ],
          },
          { type: "boolean", name: "inStock", label: "En stock" },
          { type: "boolean", name: "featured", label: "Destacado" },
          {
            type: "string",
            name: "tags",
            label: "Tags",
            list: true,
          },
          {
            type: "string",
            name: "seoTitle",
            label: "SEO: Título",
            ui: {
              validate: (val) => {
                if (val && val.length > 60) return "Máximo 60 caracteres para SEO";
                return null;
              }
            }
          },
          {
            type: "string",
            name: "seoDescription",
            label: "SEO: Descripción",
            ui: {
              component: "textarea",
              validate: (val) => {
                if (val && val.length > 160) return "Máximo 160 caracteres para SEO";
                return null;
              }
            }
          },
          { type: "datetime", name: "publishedAt", label: "Fecha publicación" },
          { type: "rich-text", name: "body", label: "Descripción del producto", isBody: true },
        ],
      },
    ],
  },
});