-- Frescos (Fase 3): precio por kg (o por unidad) de cada genérico en cada cadena, a partir de las equivalencias aprobadas.

-- Precio más bajo de cada genérico en cada cadena: precio del producto / factor (bandeja de 0,4 kg → /0,4)
create function generic_prices(ids int[])
returns table (generic_id int, chain_id smallint, price numeric, product_id bigint, product_name text, captured_at timestamptz)
language sql stable as $$
  select distinct on (m.generic_id, z.chain_id)
         m.generic_id, z.chain_id, round(pc.price / m.factor_to_unit, 2), p.id, p.name, pc.captured_at
  from fresh_mappings m
  join products p on p.id = m.product_id
  join prices_current pc on pc.product_id = m.product_id and pc.available
  join price_zones z on z.id = pc.zone_id
  where m.status = 'approved' and m.generic_id = any(ids)
  order by m.generic_id, z.chain_id, pc.price / m.factor_to_unit
$$;

-- Genéricos con al menos un precio vigente, para la búsqueda y el listado de frescos
create function search_generics(q text default null, lim int default 10)
returns table (id int, slug text, name text, unit text, category_id smallint, min_price numeric, min_chain_id smallint, chains_count int)
language sql stable as $$
  with prices as (
    select gp.* from fresh_generics g, generic_prices(array[g.id]) gp
    where q is null or g.name_norm like '%' || norm(q) || '%' or norm(q) like '%' || g.name_norm || '%'
      or exists (select 1 from unnest(regexp_split_to_array(norm(q), '\s+')) w where length(w) >= 4 and g.name_norm like w || '%')
  )
  select g.id, g.slug, g.name, g.unit, g.category_id,
         min(p.price), (array_agg(p.chain_id order by p.price))[1], count(distinct p.chain_id)::int
  from fresh_generics g join prices p on p.generic_id = g.id
  where p.captured_at > now() - interval '72 hours'
  group by g.id
  order by count(distinct p.chain_id) desc, g.name
  limit lim
$$;

grant execute on function generic_prices, search_generics to anon, authenticated;
