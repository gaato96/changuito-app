-- Funciones que usa la app (Fase 2). Corren con los permisos de quien llama (anon), así que respetan RLS.

-- Precios vigentes: disponibles y con menos de 72 horas (PLAN.md §5.3.6)
create view current_prices with (security_invoker = true) as
  select pc.*, z.chain_id
  from prices_current pc join price_zones z on z.id = pc.zone_id
  where pc.available and pc.captured_at > now() - interval '72 hours';

-- Resumen por producto para tarjetas y listados: precio más bajo, dónde, y en cuántos supers está
create view product_cards with (security_invoker = true) as
  select p.id, p.name, p.brand, p.image_url, p.size_value, p.size_unit, p.category_id, p.kind, p.name_norm,
         best.price as min_price, best.chain_id as min_chain_id, best.unit_price as min_unit_price, best.unit_label,
         agg.chains_count, agg.has_promo
  from products p
  join lateral (
    select count(distinct cp.chain_id)::int as chains_count, bool_or(cp.promo_kind <> 'none') as has_promo
    from current_prices cp where cp.product_id = p.id
  ) agg on agg.chains_count > 0
  join lateral (
    select cp.price, cp.chain_id, cp.unit_price, cp.unit_label
    from current_prices cp where cp.product_id = p.id order by cp.price limit 1
  ) best on true;

-- Búsqueda tolerante a errores y sin acentos.
-- 1) Productos que contienen todas las palabras. 2) Si faltan resultados, parecidos por trigramas.
-- Con q vacío lista la categoría. sort: 'relevance' | 'price' | 'unit_price'
create function search_products(q text default null, cat smallint default null, brand_filter text default null,
                                 sort text default 'relevance', lim int default 30, off int default 0)
returns setof product_cards language sql stable as $$
  with words as (
    select array_remove(regexp_split_to_array(norm(coalesce(q, '')), '\s+'), '') as w
  ),
  exact as (
    select c.*, 2 as tier, similarity(c.name_norm, norm(q)) as sim
    from product_cards c, words
    where (cat is null or c.category_id = cat)
      and (brand_filter is null or norm(c.brand) = norm(brand_filter))
      and not exists (select 1 from unnest(words.w) x where c.name_norm not like '%' || x || '%')
  ),
  fuzzy as (
    select c.*, 1 as tier, word_similarity(norm(q), c.name_norm) as sim
    from product_cards c
    where q is not null and length(trim(q)) >= 3
      and (cat is null or c.category_id = cat)
      and (brand_filter is null or norm(c.brand) = norm(brand_filter))
      and norm(q) <% c.name_norm
      and (select count(*) from exact) < lim
      and c.id not in (select id from exact)
  )
  select id, name, brand, image_url, size_value, size_unit, category_id, kind, name_norm,
         min_price, min_chain_id, min_unit_price, unit_label, chains_count, has_promo
  from (select * from exact union all select * from fuzzy) r
  order by
    case when sort = 'price' then r.min_price end asc nulls last,
    case when sort = 'unit_price' then r.min_unit_price end asc nulls last,
    r.tier desc, r.chains_count desc, r.sim desc, r.name
  limit lim offset off
$$;

-- Marcas de una categoría (filtro del listado)
create function category_brands(cat smallint)
returns table (brand text, n bigint) language sql stable as $$
  select brand, count(*) from product_cards where category_id = cat and brand is not null
  group by brand order by count(*) desc, brand limit 60
$$;

-- Precios de varios productos en todas las cadenas (lista de compras y modo sin conexión)
create function prices_for(ids bigint[])
returns table (product_id bigint, chain_id smallint, price numeric, list_price numeric, unit_price numeric, unit_label text,
               sold_by_weight boolean, promo_kind text, promo_min_qty smallint, promo_value numeric, promo_text text,
               loyalty text, captured_at timestamptz)
language sql stable as $$
  select pc.product_id, z.chain_id, pc.price, pc.list_price, pc.unit_price, pc.unit_label, pc.sold_by_weight,
         pc.promo_kind, pc.promo_min_qty, pc.promo_value, pc.promo_text, pc.loyalty, pc.captured_at
  from prices_current pc join price_zones z on z.id = pc.zone_id
  where pc.product_id = any(ids) and pc.available
$$;

-- Última actualización exitosa de cada cadena ("Estado de los precios" y aviso de precios viejos)
create function chain_freshness()
returns table (chain_id smallint, last_captured timestamptz) language sql stable as $$
  select z.chain_id, max(pc.captured_at) from prices_current pc join price_zones z on z.id = pc.zone_id group by z.chain_id
$$;

grant select on current_prices, product_cards to anon, authenticated;
grant execute on function search_products, category_brands, prices_for, chain_freshness to anon, authenticated;
