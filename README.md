# ExpansionTec Web

Sitio web de **ExpansionTec**, construido con Astro, TypeScript, Tailwind CSS y Astro Content Collections. Incluye catálogo de productos, páginas de detalle, sucursales, activaciones, formulario de contacto, postulaciones laborales, Libro de Reclamaciones y generación automática de fichas técnicas en PDF.

> Este README está preparado a partir de la estructura y componentes compartidos del proyecto. Revisa los nombres de scripts, versiones, variables de entorno y servicios externos contra tu `package.json`, `astro.config.mjs` y configuración de despliegue antes de usarlo como documentación final de producción.

## Índice

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Instalación local](#instalación-local)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Contenido y CMS](#contenido-y-cms)
- [Gestión de imágenes](#gestión-de-imágenes)
- [Generación de PDFs](#generación-de-pdfs)
- [Formularios y endpoints](#formularios-y-endpoints)
- [Variables de entorno](#variables-de-entorno)
- [Despliegue](#despliegue)
- [Verificaciones previas](#verificaciones-previas)
- [Solución de problemas](#solución-de-problemas)

## Stack

- [Astro](https://astro.build/) con TypeScript.
- Astro Content Layer / Content Collections mediante `src/content.config.ts`.
- Tailwind CSS para estilos responsivos y dark mode.
- TinaCMS para edición de contenido rich text, cuando corresponde.
- `pdf-lib` para crear fichas técnicas PDF sin Chromium/Puppeteer.
- `gray-matter` para leer frontmatter Markdown en scripts de Node.
- Zod para validación de schemas de contenido.
- Imágenes estáticas servidas desde `public/uploads/` y variantes optimizadas en `public/uploads/optimized/`.

## Requisitos

Instala lo siguiente antes de comenzar:

- Node.js 20 LTS o superior.
- npm 10+ (o el gestor de paquetes definido en el proyecto: pnpm/yarn).
- Git.

Comprueba las versiones:

```bash
node --version
npm --version
git --version
```

## Instalación local

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>
```

Ejemplo:

```bash
git clone git@github.com:usuario/expansiontec.git
cd expansiontec
```

### 2. Instalar dependencias

```bash
npm install
```

Para instalaciones reproducibles en CI/CD, cuando exista `package-lock.json`, utiliza:

```bash
npm ci
```

### 3. Crear variables de entorno

Crea un archivo `.env` tomando como referencia `.env.example` si existe:

```bash
cp .env.example .env
```

Si no existe, crea el archivo manualmente:

```bash
touch .env
```

Consulta la sección [Variables de entorno](#variables-de-entorno) para los valores esperados.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Astro normalmente inicia en:

```text
http://localhost:4321
```

Para exponer el servidor dentro de tu red local:

```bash
npm run dev -- --host
```

### 5. Verificar build de producción

Antes de hacer deploy, ejecuta:

```bash
npm run build
npm run preview
```

El preview suele estar disponible en:

```text
http://localhost:4321
```

> En modo `preview`, Astro sirve el contenido compilado desde `dist/`, no el servidor de desarrollo.

## Scripts disponibles

Los scripts exactos deben estar definidos en `package.json`. Esta es la configuración recomendada para este proyecto:

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "npm run generate:specs && astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "generate:specs": "node scripts/generate-specs.mjs"
  }
}
```

### Desarrollo

```bash
npm run dev
```

Inicia Astro en modo desarrollo con hot reload.

### Validación de tipos y componentes

```bash
npm run check
```

Ejecuta `astro check` para detectar errores de TypeScript, props, imports y componentes Astro.

### Generar fichas técnicas PDF

```bash
npm run generate:specs
```

Lee los Markdown de `src/content/products/`, genera un PDF por producto con `specs` y escribe el resultado en:

```text
public/specs/
```

### Build de producción

```bash
npm run build
```

El build debería ejecutar primero `generate:specs` y luego `astro build`, de modo que las fichas técnicas estén disponibles al publicar el sitio.

### Vista previa de producción

```bash
npm run preview
```

## Estructura del proyecto

```text
.
├── public/
│   ├── specs/                         # PDFs generados automáticamente
│   └── uploads/
│       ├── products/                  # Archivos originales de productos
│       └── optimized/                 # Derivadas optimizadas WebP
│           ├── activaciones/
│           ├── locations/
│           ├── marcas/
│           └── products/
├── scripts/
│   └── generate-specs.mjs             # Generador de fichas técnicas PDF
├── src/
│   ├── components/
│   │   ├── home/
│   │   ├── products/
│   │   └── ui/
│   ├── content/
│   │   ├── activations/
│   │   ├── brands/
│   │   ├── categories/
│   │   ├── locations/
│   │   ├── products/
│   │   └── sliders/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── images.ts                  # Resolver de rutas optimizadas
│   ├── pages/
│   │   ├── contacto/
│   │   ├── libro-de-reclamaciones/
│   │   ├── tienda/
│   │   │   └── producto/[slug].astro
│   │   ├── trabaja-con-nosotros/
│   │   └── index.astro
│   └── content.config.ts              # Schemas de content collections
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Contenido y CMS

El contenido se define en `src/content.config.ts` mediante `defineCollection`, `glob()` y Zod.

### Colecciones disponibles

| Colección | Ubicación | Formato | Uso |
|---|---|---|---|
| `products` | `src/content/products/` | Markdown | Catálogo, detalle, precios, stock, especificaciones |
| `sliders` | `src/content/sliders/` | JSON | Hero Slider de inicio |
| `brands` | `src/content/brands/` | JSON | Logos y sitios web de marcas |
| `categories` | `src/content/categories/` | JSON | Categorías de productos |
| `locations` | `src/content/locations/` | Markdown | Sucursales activas, contactos y mapas |
| `activations` | `src/content/activations/` | Markdown | Eventos y activaciones |

### Crear un producto

Crea un archivo Markdown en:

```text
src/content/products/<slug>.md
```

Ejemplo:

```md
---
title: POCO F8 Pro 5G
shortDescription: Batería de 6580mAh
price: 850
salePrice: 750
brand: xiaomi
category: celulares
locations:
  - location: los-olivos
  - location: miraflores
images:
  - /uploads/products/poco-f8-pro-5g.png
  - /uploads/products/poco-f8-pro-5g-1.webp
specs:
  - key: Sistema Operativo
    value: Xiaomi HyperOS 2
  - key: Tamaño de Pantalla
    value: "6.83"
  - key: Batería
    value: 6500 mAh
inStock: true
featured: true
tags:
  - 512gb
  - 5g
seoTitle: POCO F8 Pro 5G
seoDescription: Smartphone POCO F8 Pro 5G disponible en ExpansionTec.
publishedAt: 2026-02-09T22:14:56.000Z
---

Contenido descriptivo opcional en Markdown.
```

### Reglas importantes de referencias

Las referencias entre colecciones deben usar los IDs reales de las entradas:

```yaml
brand: xiaomi
category: celulares
locations:
  - location: los-olivos
```

Si un producto referencia una marca, categoría o sucursal que no existe, la página puede perder información asociada o registrar advertencias durante el build.

### Crear un slider

Crea un JSON en:

```text
src/content/sliders/<nombre>.json
```

Ejemplo:

```json
{
  "title": "PROMOCIÓN 2025",
  "subtitle": "Las mejores ofertas del año",
  "ctaLabel": "Ver Productos",
  "ctaUrl": "/productos",
  "image": "/uploads/1755816365095-d-titulo-cta-movil-210825.webp",
  "imageAlt": "Promoción 2025",
  "order": 1,
  "active": true
}
```

Los slides activos se ordenan por `order` ascendente.

## Gestión de imágenes

### Rutas originales

Las rutas guardadas en los frontmatter/JSON deben apuntar al original dentro de `public/uploads/`:

```text
/uploads/products/archivo-original.png
/uploads/archivo-slider.webp
/uploads/marcas/logo-marca.png
```

### Convención de imágenes optimizadas

El proyecto usa `src/lib/images.ts` y la función `getOptimizedImage()` para derivar rutas optimizadas.

Reglas aplicadas:

```text
Original:
/uploads/products/telefono.png

Optimizada completa:
/uploads/optimized/products/telefono.webp

Miniatura:
/uploads/optimized/products/telefono-thumb.webp
```

Para sliders sin subcarpeta:

```text
Original:
/uploads/banner.webp

Optimizada completa:
/uploads/optimized/banner.webp

Miniatura:
/uploads/optimized/banner-thumb.webp
```

El pipeline de optimización normaliza las extensiones de salida a `.webp`, incluso cuando el archivo original era `.png`, `.jpg` o `.jpeg`.

### Uso recomendado por componente

| Caso | Variante sugerida | Carga |
|---|---|---|
| Hero principal visible | `full` | `loading="eager"`, `fetchpriority="high"` |
| Slides secundarios | `full` | `loading="lazy"`, `fetchpriority="low"` |
| Banner principal de producto | `full` | `loading="eager"` si está above the fold |
| Grid/tarjeta pequeña de producto | `thumb` | `loading="lazy"` |
| Logo de marca | `full` | `loading="lazy"` |

Ejemplo:

```astro
---
import { getOptimizedImage } from "../../lib/images";

const image = getOptimizedImage(product.data.images[0]);
---

<img
  src={image.thumb}
  alt={product.data.title}
  width="128"
  height="128"
  loading="lazy"
/>
```

### Requisitos del pipeline de optimización

Por cada imagen subida, deben generarse como mínimo:

```text
public/uploads/optimized/<ruta-relativa>/<nombre>.webp
public/uploads/optimized/<ruta-relativa>/<nombre>-thumb.webp
```

Si una variante no existe, el navegador devolverá un error 404. Verifica siempre que el proceso de subida/optimización genere ambos archivos antes de publicar contenido.

## Generación de PDFs

Las fichas técnicas se crean mediante:

```text
scripts/generate-specs.mjs
```

El script:

1. Lee todos los `.md` y `.mdx` desde `src/content/products/`.
2. Omite productos sin `specs`.
3. Usa el `title` para generar un slug seguro.
4. Crea un PDF horizontal por producto.
5. Dibuja la imagen del producto, el título y una cuadrícula de cinco especificaciones por fila.
6. Genera nuevas páginas si la cantidad de especificaciones excede el espacio disponible.
7. Escribe el resultado en `public/specs/<slug>.pdf`.

### Convención de nombre del PDF

El generador y la página de producto deben usar la misma normalización de título:

```js
const safeTitle = title
  .toLowerCase()
  .replace(/\//g, "-")
  .replace(/[^a-z0-9]/gi, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");
```

Por ejemplo:

```text
POCO F8 Pro 5G
```

Genera:

```text
public/specs/poco-f8-pro-5g.pdf
```

### Formatos de imagen y PDF

`pdf-lib` embebe PNG y JPG/JPEG de forma nativa. Si las imágenes de producto son solamente WebP, el script puede no incluirlas sin una conversión previa.

Opciones:

- Mantener una imagen fuente PNG/JPG para uso del PDF.
- Agregar `sharp` al proyecto y convertir WebP a PNG en memoria antes de embebirla.
- Generar una variante PNG/JPG adicional durante el pipeline de imágenes.

Ejecuta el generador manualmente:

```bash
npm run generate:specs
```

## Formularios y endpoints

El frontend contiene tres formularios que requieren un backend o proveedor externo para enviar y guardar datos reales.

### Contacto

Ruta:

```text
/contacto
```

Campos:

- Nombre.
- Email.
- Asunto.
- Mensaje.
- Sucursal de interés.

Endpoint recomendado:

```text
POST /api/contact
```

### Trabaja con nosotros

Ruta:

```text
/trabaja-con-nosotros
```

Campos:

- Nombres y apellidos.
- Teléfono.
- Correo electrónico.
- Sucursal deseada.
- CV adjunto.
- Consentimiento de tratamiento de datos personales.

Archivos aceptados desde frontend:

```text
PDF, DOC, DOCX, JPG, PNG y WebP
```

Límite configurado en frontend:

```text
5 MB
```

Endpoint recomendado:

```text
POST /api/job-application
Content-Type: multipart/form-data
```

El endpoint debe validar de nuevo el tamaño y MIME type del archivo, subirlo a almacenamiento privado y guardar solo la ruta del archivo, no el binario directamente en una tabla sin control.

### Libro de Reclamaciones

Ruta:

```text
/libro-de-reclamaciones
```

Endpoint recomendado:

```text
POST /api/claims
```

El endpoint debe:

1. Validar todos los datos en servidor.
2. Guardar la fecha/hora de recepción y un código único de reclamo.
3. Registrar el estado inicial del caso.
4. Enviar constancia al consumidor por email.
5. Notificar al equipo responsable.
6. Mantener trazabilidad y acceso seguro a la información personal.

> No marques un formulario como enviado si no existe un endpoint real. La UI debe mostrar éxito únicamente después de recibir una respuesta satisfactoria del servidor.

## WhatsApp de productos

La página de producto usa el número configurado para consultas de compra:

```text
51926206080
```

El botón **Comprar ahora** genera un enlace con:

- El nombre del producto.
- La URL absoluta de la página del producto.

Ejemplo de implementación:

```ts
const WHATSAPP_NUMBER = "51926206080";
const message = `Hola, quiero consultar sobre este producto: ${product.data.title}\n${productPageUrl}`;
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
```

No redirijas al usuario a WhatsApp como compra si `product.data.inStock` es `false`. En ese caso, el CTA debe informar que el producto está agotado o permitir una consulta de reposición, según la política comercial.

## Variables de entorno

La configuración exacta depende de los servicios conectados. Nunca subas `.env` al repositorio.

Ejemplo de `.env.example`:

```bash
# URL pública final del sitio; importante para SEO, canonical URLs y enlaces absolutos.
PUBLIC_SITE_URL=https://www.tudominio.pe

# Supabase: opcional si se usa para formularios, archivos o base de datos.
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email/Resend: solo para endpoints server-side; nunca exponer al cliente.
RESEND_API_KEY=
CONTACT_TO_EMAIL=
HR_TO_EMAIL=
CLAIMS_TO_EMAIL=

# Storage opcional.
SUPABASE_STORAGE_BUCKET=applications
```

### Reglas de seguridad

- Variables con `PUBLIC_` pueden quedar disponibles en el cliente. No coloques secretos ahí.
- `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y credenciales de backend deben usarse solo en server-side endpoints.
- Agrega `.env`, `.env.local`, `.env.production` y archivos de claves a `.gitignore`.
- Mantén un `.env.example` sin secretos reales para el equipo.

## Despliegue

### Build estático

El proyecto usa `export const prerender = true` en páginas estáticas. Si todas las páginas son estáticas y los formularios se resuelven con servicios externos, puedes desplegar el resultado de `dist/` en servicios como:

- Cloudflare Pages.
- Netlify.
- Vercel.
- GitHub Pages.
- Hosting compartido con carga de archivos estáticos.

Comando de build:

```bash
npm ci
npm run build
```

Directorio de publicación:

```text
dist/
```

### Endpoints para formularios

Si implementas rutas como `/api/contact`, `/api/job-application` o `/api/claims`, necesitarás un adaptador de servidor compatible con tu plataforma, por ejemplo:

```bash
npm install @astrojs/vercel
```

o:

```bash
npm install @astrojs/netlify
```

Luego configura el adaptador apropiado en `astro.config.mjs` y verifica que los endpoints no estén prerenderizados.

### Checklist de CI/CD

Una pipeline mínima debería ejecutar:

```bash
npm ci
npm run check
npm run generate:specs
npm run build
```

Si `generate:specs` ya está incluido dentro de `build`, no lo ejecutes dos veces.

## Verificaciones previas

Antes de publicar una versión, valida lo siguiente:

### Contenido

- [ ] Todos los productos pasan la validación de `content.config.ts`.
- [ ] Las referencias de marca, categoría y sucursal existen.
- [ ] Los precios son números válidos y mayores que cero.
- [ ] `salePrice`, si existe, es menor que `price`.
- [ ] Los productos agotados tienen `inStock: false` y se muestran con el estado visual adecuado.
- [ ] Cada producto tiene al menos una imagen o un fallback visual definido.

### Imágenes

- [ ] Cada original de `/uploads/` tiene sus derivados en `/uploads/optimized/`.
- [ ] La variante completa termina en `.webp`.
- [ ] La miniatura termina en `-thumb.webp`.
- [ ] No existen URLs con subcarpetas duplicadas, por ejemplo `optimized/products/products/...`.
- [ ] Hero Slider usa `loading="eager"` y `fetchpriority="high"` solo para el primer slide.
- [ ] Los slides restantes usan `loading="lazy"`.

### PDFs

- [ ] `npm run generate:specs` se ejecutó sin errores.
- [ ] Los PDFs aparecen en `public/specs/` antes del build.
- [ ] El nombre del PDF coincide con el slug calculado desde el título.
- [ ] Las imágenes usadas por PDF están disponibles en PNG/JPG o se convierten correctamente desde WebP.

### Formularios

- [ ] Los endpoints reales están configurados antes de activar mensajes de éxito.
- [ ] El backend valida todos los datos sin confiar solo en el navegador.
- [ ] Los archivos de CV se validan por tamaño y MIME type en servidor.
- [ ] Los CV se guardan en un bucket privado.
- [ ] Los reclamos reciben un código único y constancia de recepción.
- [ ] Las claves privadas no llegan al navegador ni al repositorio.

### SEO y accesibilidad

- [ ] Todas las imágenes relevantes tienen `alt` descriptivo.
- [ ] Los links externos tienen `rel="noopener noreferrer"` al usar `target="_blank"`.
- [ ] Los controles interactivos tienen estados `focus-visible`.
- [ ] Cada página tiene `title` y `description` adecuados.
- [ ] Las páginas de producto incluyen JSON-LD `Product` y disponibilidad correcta.

## Solución de problemas

### Astro sigue mostrando código antiguo

Detén el servidor, limpia caché y reinicia:

```bash
rm -rf .astro node_modules/.astro dist
npm run dev
```

### La imagen optimizada devuelve 404

Revisa la ruta original del frontmatter. El helper espera que las derivadas respeten la ruta relativa después de `/uploads/` y fuercen extensión `.webp`.

Ejemplo esperado:

```text
Original:
/uploads/products/telefono.png

Full:
/uploads/optimized/products/telefono.webp

Thumb:
/uploads/optimized/products/telefono-thumb.webp
```

### Aparece `products/products` en la URL

La subcarpeta ya viene incluida en la ruta original. No debes agregar `products` manualmente al llamar a `getOptimizedImage()`.

Correcto:

```ts
getOptimizedImage("/uploads/products/telefono.png");
```

Incorrecto:

```ts
getOptimizedImage("/uploads/products/telefono.png", "products");
```

### Aparece una ruta `.png` dentro de `optimized/`

Las imágenes optimizadas se convierten a WebP. Verifica que `src/lib/images.ts` fuerce la extensión `.webp`:

```ts
const OPTIMIZED_EXT = ".webp";
```

### Error `Field is not defined` en Astro

No uses etiquetas con mayúscula como `<Field />` o `<DateField />` sin haberlas importado o creado como componentes `.astro` reales. Usa inputs HTML explícitos o importa el componente correspondiente.

### El PDF no incluye la imagen del producto

`pdf-lib` no embebe WebP directamente. Usa una imagen original PNG/JPG o agrega una conversión con `sharp` antes de llamar a `embedPng()`/`embedJpg()`.

### El PDF tiene texto fuera de una tarjeta

El generador debe usar una función de wrap que rompa tokens largos sin espacios (por ejemplo, bandas móviles separadas por `/`) y reduzca el tamaño de fuente antes de truncar. Verifica que `generate-specs.mjs` incluya `breakLongToken()` y `fitText()`.

### El formulario aparenta enviarse, pero no llega nada

Un formulario estático no envía correos ni guarda registros por sí solo. Implementa el endpoint o integra un proveedor antes de mostrar una confirmación de éxito.

## Convenciones de desarrollo

- Usa TypeScript y evita `any` en componentes, frontmatter y funciones de contenido.
- Reutiliza `CollectionEntry<"collection">` para props de componentes que reciben contenido.
- Centraliza la lógica de imágenes en `src/lib/images.ts`.
- Centraliza valores repetidos (límites, números de WhatsApp, URLs, nombres de buckets) en módulos de configuración o variables de entorno.
- No añadas claves de API, secretos ni tokens en archivos de contenido, componentes Astro ni JavaScript del cliente.
- Ejecuta `npm run check` y `npm run build` antes de cada pull request o despliegue.

## Licencia

Proyecto privado de ExpansionTec. Todos los derechos reservados.
