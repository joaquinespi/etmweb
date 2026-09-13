import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import tina from '@tinacms/astro/integration';

export default defineConfig({
  site: "https://expansiontecmye.pe",
  output: "static",

  integrations: [
    react(),
    tina(),
    sitemap({
      filter: (page) => !page.includes("/admin"),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // ❌ No incluir react, nanostores, etc.
            // ✅ Solo si tienes módulos propios grandes
            // 'shop': ['./src/components/shop/AddToCart.tsx', './src/components/shop/CartDrawer.tsx'],
          },
        },
      },
    },
    ssr: {
      noExternal: ['@nanostores/react', 'nanostores'],
    },
  },

  image: {
    service: {
      entrypoint: "astro/assets/services/sharp"
    },
  },
});