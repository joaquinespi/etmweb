# Backup TinaCMS → Supabase (Fase 1)

Esta carpeta contiene todo lo necesario para hacer snapshot periódico de tu contenido TinaCMS en Supabase. No reemplaza Tina — es solo espejo.

Setup (una sola vez, ~5 min)

1. Crear proyecto en Supabase

    Ve a supabase.com/dashboard → New Project

    Elige región cerca a Lima: South America (São Paulo) es la más cercana

    Guarda la database password en un lugar seguro

2. Crear las tablas

    En el dashboard: SQL Editor → New query

    Pega todo el contenido de schema.sql y dale Run

    Deberías ver 6 tablas nuevas en Table Editor: brands, categories, sliders, locations, activations, products

3. Crear el bucket de Storage

    Storage → New bucket → nombre: tina-backup

    Déjalo Private por ahora (lo haces público cuando migres de verdad)

4. Obtener las credenciales

    Settings → API:

        Project URL → SUPABASE_URL

        service_role key (NO la anon) → SUPABASE_SERVICE_ROLE_KEY

        ⚠️ La service_role bypassa Row Level Security. No la expongas al público.

5. Configurar .env en tu proyecto

bash

cp .env.example .env
Edita .env y pega tus credenciales

⚠️ No commitees .env — verifica que .gitignore lo incluya.

Uso

Backup de contenido (datos)

bash

npm run backup:content

Lee todos los .md y .json de src/content/ y los sube/actualiza en Supabase.

Idempotente: correlo cada vez que quieras snapshot. No duplica, hace upsert por slug.

Backup de medios (imágenes)

bash

npm run backup:media

Sube los 77 archivos de public/uploads/ al bucket tina-backup. Mantiene la estructura de carpetas.

Automatización sugerida

Opción A: Manual

Corre los 2 comandos cada vez que hagas deploy o cuando quieras snapshot:

bash

npm run backup:content && npm run backup:media

Opción B: GitHub Action (CI)

Crea .github/workflows/backup-supabase.yml:

yaml

name: Backup to Supabase
on:
  push:
    branches: [main]   # se dispara cada vez que haces merge a main

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run backup:content
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - run: npm run backup:media
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

Y en GitHub: Settings → Secrets → Actions agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.

Verificación rápida

Después del primer backup, en Supabase Table Editor deberías ver:

| Tabla | Registros esperados |
| --- | --- |
| brands | 7 (apple, honor, motorola, oppo, redmi, samsung, xiaomi) |
| categories | 3 (accesorios, celulares, wearables) |
| sliders | 4 (slide-1 a slide-4) |
| locations | 3 (la-molina, los-olivos, miraflores) |
| activations | 4 (promo-abril, semana-de-accesorios, etc.) |
| products | 13 (poco, redmi, xiaomi, etc.) |

Y en Storage → tina-backup deberías ver ~77 archivos.

Restaurar (si algo explota en Tina)

El script es solo de subida. Para restaurar, en TinaCMS:

    1.
    Borra el archivo viejo en src/content/
    2.
    Desde Supabase, descarga el JSON/row equivalente
    3.
    Recrea el archivo a mano (o pídeme que te arme un script inverso)

Para Fase 2/3 con migración real, el script incluirá backup:restore bidireccional.