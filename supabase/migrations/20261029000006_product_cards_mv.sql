-- product_cards pasa a ser una vista materializada: calcularla en cada búsqueda tardaba ~400 ms.
-- La ingesta y el mantenimiento la refrescan al terminar (refresh_product_cards).

drop function search_products(text, smallint, text, text, int, int);
drop function category_brands(smallint);
drop view product_cards;

create materialized view product_cards as
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

create unique index product_cards_id on product_cards (id);
create index product_cards_category on product_cards (category_id);
create index product_cards_name_trgm on product_cards using gin (name_norm gin_trgm_ops);

create function refresh_product_cards() returns void language sql security definer set search_path = public as $$
  refresh materialized view concurrently product_cards
$$;
revoke execute on function refresh_product_cards from public, anon, authenticated;

-- Búsqueda: primero productos que contienen todas las palabras; solo si no hay ninguno, parecidos por trigramas
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
      and not exists (select 1 from exact)
      and (cat is null or c.category_id = cat)
      and (brand_filter is null or norm(c.brand) = norm(brand_filter))
      and norm(q) <% c.name_norm
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

create function category_brands(cat smallint)
returns table (brand text, n bigint) language sql stable as $$
  select brand, count(*) from product_cards where category_id = cat and brand is not null
  group by brand order by count(*) desc, brand limit 60
$$;

grant select on product_cards to anon, authenticated;
grant execute on function search_products, category_brands to anon, authenticated;
