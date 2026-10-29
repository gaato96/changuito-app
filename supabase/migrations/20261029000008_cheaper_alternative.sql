-- Alternativa más barata (PLAN.md §5.3.5, solo aviso): en el mismo super, un producto de la misma categoría,
-- con talle ±10% y menor precio por unidad. Devuelve la mejor alternativa por super.
create function cheaper_alternatives(pid bigint)
returns table (chain_id smallint, product_id bigint, name text, price numeric, unit_price numeric, unit_label text, saving_pct int)
language sql stable as $$
  with base as (
    select p.id, p.category_id, p.size_value, p.size_unit, cp.chain_id, cp.unit_price
    from products p join current_prices cp on cp.product_id = p.id
    where p.id = pid and p.kind = 'packaged' and p.size_value is not null and cp.unit_price is not null and p.category_id is not null
  )
  select distinct on (b.chain_id) b.chain_id, o.id, o.name, ocp.price, ocp.unit_price, ocp.unit_label,
         round((1 - ocp.unit_price / b.unit_price) * 100)::int
  from base b
  join products o on o.category_id = b.category_id and o.size_unit = b.size_unit and o.id <> b.id
    and o.size_value between b.size_value * 0.9 and b.size_value * 1.1
  join current_prices ocp on ocp.product_id = o.id and ocp.chain_id = b.chain_id
  where ocp.unit_price < b.unit_price * 0.95
    -- mismo tipo de producto: comparten la primera palabra del nombre ("Aceite", "Yerba", "Leche")
    and split_part(o.name_norm, ' ', 1) = split_part((select name_norm from products where id = pid), ' ', 1)
  order by b.chain_id, ocp.unit_price
$$;

grant execute on function cheaper_alternatives to anon, authenticated;
