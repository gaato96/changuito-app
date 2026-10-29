-- Orden y filtros de la búsqueda: en qué supers está cada producto, solo con promo y cobertura mínima.

drop function search_products(text, smallint, text, text, int, int);
drop function category_brands(smallint);
drop materialized view product_cards;

create materialized view product_cards as
  select p.id, p.name, p.brand, p.image_url, p.size_value, p.size_unit, p.category_id, p.kind, p.name_norm,
         best.price as min_price, best.chain_id as min_chain_id, best.unit_price as min_unit_price, best.unit_label,
         agg.chains_count, agg.has_promo, agg.chain_ids, agg.max_price
  from products p
  join lateral (
    select count(distinct cp.chain_id)::int as chains_count, bool_or(cp.promo_kind not in ('none', 'text')) as has_promo,
           array_agg(distinct cp.chain_id) as chain_ids, max(cp.price) as max_price
    from current_prices cp where cp.product_id = p.id
  ) agg on agg.chains_count > 0
  join lateral (
    select cp.price, cp.chain_id, cp.unit_price, cp.unit_label
    from current_prices cp where cp.product_id = p.id order by cp.price limit 1
  ) best on true;

create unique index product_cards_id on product_cards (id);
create index product_cards_category on product_cards (category_id);
create index product_cards_name_trgm on product_cards using gin (name_norm gin_trgm_ops);
create index product_cards_chains on product_cards using gin (chain_ids);

-- sort: 'relevance' | 'price' | 'unit_price' | 'coverage'
-- chain: solo productos que están en ese super (y el precio mostrado pasa a ser el de ese super)
create function search_products(q text default null, cat smallint default null, brand_filter text default null,
                                 sort text default 'relevance', lim int default 30, off int default 0,
                                 chain smallint default null, promo_only boolean default false, min_chains int default 1)
returns setof product_cards language sql stable as $$
  with words as (
    select array_remove(regexp_split_to_array(norm(coalesce(q, '')), '\s+'), '') as w
  ),
  filtered as (
    select c.* from product_cards c
    where (cat is null or c.category_id = cat)
      and (brand_filter is null or norm(c.brand) = norm(brand_filter))
      and (chain is null or chain = any(c.chain_ids))
      and (not promo_only or c.has_promo)
      and c.chains_count >= greatest(min_chains, 1)
  ),
  exact as (
    select f.*, 2 as tier, similarity(f.name_norm, norm(q)) as sim
    from filtered f, words
    where not exists (select 1 from unnest(words.w) x where f.name_norm not like '%' || x || '%')
  ),
  fuzzy as (
    select f.*, 1 as tier, word_similarity(norm(q), f.name_norm) as sim
    from filtered f
    where q is not null and length(trim(q)) >= 3
      and not exists (select 1 from exact)
      and norm(q) <% f.name_norm
  ),
  ranked as (select * from exact union all select * from fuzzy),
  -- Con un super elegido, se muestra el precio de ese super
  priced as (
    select r.id, r.name, r.brand, r.image_url, r.size_value, r.size_unit, r.category_id, r.kind, r.name_norm,
           coalesce(cp.price, r.min_price) as min_price, coalesce(cp.chain_id, r.min_chain_id) as min_chain_id,
           case when cp.product_id is null then r.min_unit_price else cp.unit_price end as min_unit_price,
           coalesce(cp.unit_label, r.unit_label) as unit_label,
           r.chains_count, r.has_promo, r.chain_ids, r.max_price, r.tier, r.sim
    from ranked r
    left join current_prices cp on chain is not null and cp.product_id = r.id and cp.chain_id = chain
  )
  select id, name, brand, image_url, size_value, size_unit, category_id, kind, name_norm,
         min_price, min_chain_id, min_unit_price, unit_label, chains_count, has_promo, chain_ids, max_price
  from priced
  order by
    case when sort = 'price' then min_price end asc nulls last,
    case when sort = 'unit_price' then min_unit_price end asc nulls last,
    case when sort = 'coverage' then chains_count end desc nulls last,
    tier desc, chains_count desc, sim desc, name
  limit lim offset off
$$;

-- Marcas presentes en una búsqueda o categoría (para el filtro), con la misma lógica de coincidencia
create function search_brands(q text default null, cat smallint default null)
returns table (brand text, n bigint) language sql stable as $$
  with words as (select array_remove(regexp_split_to_array(norm(coalesce(q, '')), '\s+'), '') as w)
  select c.brand, count(*) from product_cards c, words
  where c.brand is not null and (cat is null or c.category_id = cat)
    and not exists (select 1 from unnest(words.w) x where c.name_norm not like '%' || x || '%')
  group by c.brand order by count(*) desc, c.brand limit 40
$$;

create function category_brands(cat smallint)
returns table (brand text, n bigint) language sql stable as $$
  select * from search_brands(null, cat)
$$;

grant select on product_cards to anon, authenticated;
grant execute on function search_products, search_brands, category_brands to anon, authenticated;
