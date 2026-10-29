-- Changuito: esquema inicial (Fase 1)
-- Ajustado con la Fase 0: los precios se guardan por "zona de precio" (una por cadena en la v1),
-- no por sucursal. Las sucursales quedan como referencia y para detectar si una cadena se divide en zonas.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------- cadenas, zonas y sucursales
create table chains (
  id            smallint primary key,
  slug          text not null unique,
  name          text not null,                 -- "ChangoMás"
  display_name  text not null,                 -- "ChangoMás (Hiper Camino del Perú)"
  source        text not null check (source in ('vtex', 'sepa')),
  base_url      text,
  color         text not null,                 -- token del sistema de diseño
  active        boolean not null default true,
  has_promos    boolean not null default true, -- Vea y Jumbo: SEPA no informa promos
  sort_order    smallint not null default 0
);

create table price_zones (
  id          smallint primary key,
  chain_id    smallint not null references chains(id),
  slug        text not null unique,
  name        text not null,
  is_default  boolean not null default true
);

create table stores (
  id           serial primary key,
  chain_id     smallint not null references chains(id),
  zone_id      smallint not null references price_zones(id),
  external_id  text not null,                  -- SEPA: "comercio-bandera-sucursal"; VTEX: "web"
  name         text not null,
  address      text,
  locality     text,
  lat          double precision,
  lng          double precision,
  is_virtual   boolean not null default false,
  active       boolean not null default true,
  unique (chain_id, external_id)
);

-- ---------------------------------------------------------------- categorías
create table categories (
  id            smallint primary key,
  slug          text not null unique,
  name          text not null,
  icon          text not null,                 -- Material Symbols
  sort_order    smallint not null,
  sector_order  smallint not null              -- orden de recorrido en el modo compra
);

-- Mapeo de la categoría de cada cadena a las 10 unificadas (prefijo de ruta, gana el más largo)
create table category_map (
  chain_id       smallint not null references chains(id),
  external_path  text not null,                -- "/Frescos/Fiambres y Embutidos/"
  category_id    smallint not null references categories(id),
  primary key (chain_id, external_path)
);

-- ---------------------------------------------------------------- productos
create table products (
  id             bigserial primary key,
  ean            text unique,                  -- EAN-13 universal; null para códigos internos (2…)
  origin_chain   smallint references chains(id),
  origin_sku     text,                         -- solo si ean es null
  name           text not null,
  brand          text,
  size_value     numeric(12, 3),               -- en g, ml o unidades
  size_unit      text check (size_unit in ('g', 'ml', 'u')),
  category_id    smallint references categories(id),
  image_url      text,
  kind           text not null default 'packaged' check (kind in ('packaged', 'weighed')),
  name_source    smallint,                     -- prioridad de la fuente del nombre (menor = mejor)
  name_norm      text not null,                -- minúsculas, sin acentos (calculado en la ingesta)
  search_tsv     tsvector generated always as (to_tsvector('simple', name_norm)) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (origin_chain, origin_sku),
  check ((ean is not null) or (origin_chain is not null and origin_sku is not null))
);
create index products_name_trgm on products using gin (name_norm gin_trgm_ops);
create index products_tsv on products using gin (search_tsv);
create index products_category on products (category_id);

create table chain_products (
  chain_id          smallint not null references chains(id),
  external_sku      text not null,             -- VTEX itemId; SEPA id_producto
  product_id        bigint not null references products(id) on delete cascade,
  raw_name          text not null,
  external_path     text,
  url               text,
  measurement_unit  text,                      -- VTEX: 'un' | 'kg'
  unit_multiplier   numeric(10, 4),
  last_seen_at      timestamptz not null default now(),
  primary key (chain_id, external_sku)
);
create index chain_products_product on chain_products (product_id);

-- ---------------------------------------------------------------- frescos
create table fresh_generics (
  id           serial primary key,
  slug         text not null unique,
  name         text not null,                  -- "Tomate redondo"
  unit         text not null check (unit in ('kg', 'unidad')),
  category_id  smallint not null references categories(id),
  keywords     text[] not null default '{}',   -- para proponer candidatos
  name_norm    text not null
);

create table fresh_mappings (
  generic_id      int not null references fresh_generics(id) on delete cascade,
  product_id      bigint not null references products(id) on delete cascade,
  chain_id        smallint not null references chains(id),
  factor_to_unit  numeric(10, 4) not null default 1,  -- bandeja de 0,4 kg → 0,4
  status          text not null default 'suggested' check (status in ('suggested', 'approved', 'rejected')),
  score           real,
  note            text,
  decided_at      timestamptz,
  primary key (generic_id, product_id)
);
create index fresh_mappings_status on fresh_mappings (status);

-- ---------------------------------------------------------------- precios
create table prices_current (
  zone_id         smallint not null references price_zones(id),
  product_id      bigint not null references products(id) on delete cascade,
  price           numeric(12, 2) not null,     -- lo que pagás por 1 unidad (o 1 kg), con descuento directo
  list_price      numeric(12, 2) not null,     -- precio sin descuento
  unit_price      numeric(12, 2),              -- por kg, litro o unidad
  unit_label      text check (unit_label in ('kg', 'l', 'u')),
  sold_by_weight  boolean not null default false,
  promo_kind      text not null default 'none' check (promo_kind in ('none', 'pct', 'nth_pct', 'nxm', 'qty_price', 'text')),
  promo_min_qty   smallint,                    -- nth_pct: n; nxm: n; qty_price: n
  promo_value     numeric(12, 2),              -- nth_pct: %; nxm: m; qty_price: $ c/u; pct: %
  promo_text      text,
  loyalty         text check (loyalty in ('mi_carrefour')),
  available       boolean not null default true,
  source          text not null,               -- 'vtex-sim' | 'sepa' | 'laanonima-web'
  captured_at     timestamptz not null,
  primary key (zone_id, product_id)
);
create index prices_current_product on prices_current (product_id);

create table price_history (
  zone_id      smallint not null,
  product_id   bigint not null,
  valid_from   timestamptz not null,
  price        numeric(12, 2) not null,
  list_price   numeric(12, 2) not null,
  promo_kind   text not null,
  promo_value  numeric(12, 2),
  primary key (zone_id, product_id, valid_from)
);
create index price_history_valid_from on price_history (valid_from);

-- El historial se inserta solo cuando cambia el precio o la promo
create function log_price_change() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.list_price is distinct from old.list_price
     or new.promo_kind is distinct from old.promo_kind
     or new.promo_value is distinct from old.promo_value then
    insert into price_history (zone_id, product_id, valid_from, price, list_price, promo_kind, promo_value)
    values (new.zone_id, new.product_id, new.captured_at, new.price, new.list_price, new.promo_kind, new.promo_value)
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger prices_current_history
  after insert or update on prices_current
  for each row execute function log_price_change();

-- ---------------------------------------------------------------- operación
create table ingest_runs (
  id             bigserial primary key,
  source         text not null,                -- 'vtex' | 'sepa' | 'maintenance'
  chain_id       smallint references chains(id),
  mode           text,                         -- vtex: 'full' | 'prices'
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running', 'ok', 'failed', 'skipped')),
  items_read     int,
  items_written  int,
  stats          jsonb not null default '{}',
  error          text
);
create index ingest_runs_recent on ingest_runs (started_at desc);

create table search_log (
  id          bigserial primary key,
  term_norm   text not null check (length(term_norm) between 1 and 80),
  results     int not null,
  created_at  timestamptz not null default now()
);
create index search_log_recent on search_log (created_at desc);

create table search_synonyms (
  term_norm   text primary key,
  product_id  bigint references products(id) on delete cascade,
  generic_id  int references fresh_generics(id) on delete cascade,
  ignored     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table admin_emails (
  email  text primary key
);

-- Normalización usada por la búsqueda (igual a la de la ingesta: minúsculas y sin acentos)
create function norm(t text) returns text language sql immutable parallel safe as $$
  select lower(public.unaccent('public.unaccent'::regdictionary, coalesce(t, '')))
$$;
