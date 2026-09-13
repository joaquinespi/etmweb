-- =====================================================
-- ExpansionTec - Schema de Backup para Supabase
-- =====================================================
-- Ejecutar en: Supabase → SQL Editor → New Query
-- Idempotente: puedes correrlo varias veces sin romper nada.
--
-- Convenciones:
--   * `slug` siempre es el nombre del archivo sin extensión (PRIMARY KEY)
--   * Campos anidados / arrays se guardan como JSONB
--   * Rich-text / markdown se guarda como TEXT crudo
--   * Timestamps en timestamptz (ISO 8601 UTC)
-- =====================================================

-- ---------- BRANDS ----------
create table if not exists brands (
  slug      text primary key,
  name      text not null,
  logo      text,                       -- ruta /uploads/marcas/...
  website   text,
  raw       jsonb,                      -- copia completa del JSON original
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- CATEGORIES ----------
create table if not exists categories (
  slug          text primary key,
  name          text not null,
  description   text,
  image         text,
  featuredImage text,
  banner        text,
  raw           jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- SLIDERS ----------
create table if not exists sliders (
  slug      text primary key,
  title     text not null,
  subtitle  text,
  ctaLabel  text,
  ctaUrl    text,
  image     text not null,
  imageAlt  text,
  "order"   integer default 0,
  active    boolean default true,
  raw       jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- LOCATIONS ----------
create table if not exists locations (
  slug          text primary key,
  name          text not null,
  image         text,
  district      text,
  city          text,
  address       text,
  phone         text,
  email         text,
  lat           numeric,
  lng           numeric,
  schedule      text,
  mapEmbedUrl   text,
  googleMapsUrl text,
  wazeUrl       text,
  isActive      boolean default true,
  body          text,                   -- markdown rich-text
  raw           jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- ACTIVATIONS ----------
create table if not exists activations (
  slug        text primary key,
  title       text not null,
  startDate   timestamptz,
  endDate     timestamptz,
  locations   jsonb default '[]'::jsonb,   -- array de slugs
  products    jsonb default '[]'::jsonb,   -- array de objetos {product}
  banner      text,
  gallery     jsonb default '[]'::jsonb,   -- array de rutas de imágenes
  isPublished boolean default false,
  body        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table if not exists products (
  slug              text primary key,
  title             text not null,
  shortDescription  text,
  availableColors   jsonb default '[]'::jsonb,  -- [{name, hex}]
  price             numeric,
  salePrice         numeric,
  brand             text,
  category          text,
  locations         jsonb default '[]'::jsonb,  -- [{location: slug}]
  mainImage         text,
  images            jsonb default '[]'::jsonb,  -- array de rutas
  specs             jsonb default '[]'::jsonb,  -- [{key, value (markdown)}]
  inStock           boolean default true,
  featured          boolean default false,
  tags              jsonb default '[]'::jsonb,
  seoTitle          text,
  seoDescription    text,
  publishedAt       timestamptz,
  body              text,
  raw               jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ---------- INDEXES (para búsquedas futuras) ----------
create index if not exists idx_products_brand    on products(brand);
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_featured on products(featured) where featured = true;
create index if not exists idx_activations_dates on activations(startDate, endDate);
create index if not exists idx_locations_active  on locations(isActive) where isActive = true;
create index if not exists idx_sliders_order     on sliders("order") where active = true;

-- ---------- TRIGGER: auto-actualizar updated_at ----------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['brands','categories','sliders','locations','activations','products'])
  loop
    execute format(
      'drop trigger if exists trg_touch_%I on %I; '
      'create trigger trg_touch_%I before update on %I '
      'for each row execute function touch_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;