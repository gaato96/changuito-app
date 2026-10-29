-- Orden por precio por unidad: primero los productos con la unidad más común en los resultados (ej. litros),
-- porque comparar $/litro con $/unidad no tiene sentido; el resto va al final.
create or replace function search_products(q text default null, cat smallint default null, brand_filter text default null,
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
  priced as (
    select r.id, r.name, r.brand, r.image_url, r.size_value, r.size_unit, r.category_id, r.kind, r.name_norm,
           coalesce(cp.price, r.min_price) as min_price, coalesce(cp.chain_id, r.min_chain_id) as min_chain_id,
           case when cp.product_id is null then r.min_unit_price else cp.unit_price end as min_unit_price,
           coalesce(cp.unit_label, r.unit_label) as unit_label,
           r.chains_count, r.has_promo, r.chain_ids, r.max_price, r.tier, r.sim
    from ranked r
    left join current_prices cp on chain is not null and cp.product_id = r.id and cp.chain_id = chain
  ),
  main_label as (
    select unit_label from priced where unit_label is not null group by unit_label order by count(*) desc limit 1
  )
  select p.id, p.name, p.brand, p.image_url, p.size_value, p.size_unit, p.category_id, p.kind, p.name_norm,
         p.min_price, p.min_chain_id, p.min_unit_price, p.unit_label, p.chains_count, p.has_promo, p.chain_ids, p.max_price
  from priced p
  order by
    case when sort = 'price' then p.min_price end asc nulls last,
    case when sort = 'unit_price' then (p.unit_label is distinct from (select unit_label from main_label)) end asc,
    case when sort = 'unit_price' then p.min_unit_price end asc nulls last,
    case when sort = 'coverage' then p.chains_count end desc nulls last,
    p.tier desc, p.chains_count desc, p.sim desc, p.name
  limit lim offset off
$$;
