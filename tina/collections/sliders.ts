import type { Collection } from "tinacms";

export const slidersCollection: Collection = {
  name: "sliders",
  label: "Hero Sliders",
  path: "src/content/sliders",
  format: "json",
  ui: {
    allowedActions: { create: true, delete: true },
  },
  fields: [
    { type: "string",  name: "title",     label: "Título", required: true, searchable: true },
    { type: "string",  name: "subtitle",  label: "Subtítulo", searchable: true },
    { type: "string",  name: "ctaLabel",  label: "Texto del botón" },
    { type: "string",  name: "ctaUrl",    label: "URL del botón" },
    { type: "image",   name: "image",     label: "Imagen de fondo", required: true },
    { type: "string",  name: "imageAlt",  label: "Alt de imagen" },
    { type: "number",  name: "order",     label: "Orden" },
    { type: "boolean", name: "active",    label: "Activo" },
  ],
};