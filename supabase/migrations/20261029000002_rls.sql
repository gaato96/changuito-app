-- Changuito: seguridad (RLS)
-- La app pública usa la clave anon: lee catálogo y precios, y solo puede insertar en search_log.
-- El panel admin entra con magic link; el email tiene que estar en admin_emails.
-- La ingesta se conecta con el usuario dueño de la base (DATABASE_URL en los secretos de Actions) y no pasa por RLS.

create function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_emails where email = (auth.jwt() ->> 'email'))
$$;

alter table chains          enable row level security;
alter table price_zones     enable row level security;
alter table stores          enable row level security;
alter table categories      enable row level security;
alter table category_map    enable row level security;
alter table products        enable row level security;
alter table chain_products  enable row level security;
alter table fresh_generics  enable row level security;
alter table fresh_mappings  enable row level security;
alter table prices_current  enable row level security;
alter table price_history   enable row level security;
alter table ingest_runs     enable row level security;
alter table search_log      enable row level security;
alter table search_synonyms enable row level security;
alter table admin_emails    enable row level security;

-- Lectura pública del catálogo
create policy public_read on chains          for select to anon, authenticated using (true);
create policy public_read on price_zones     for select to anon, authenticated using (true);
create policy public_read on stores          for select to anon, authenticated using (true);
create policy public_read on categories      for select to anon, authenticated using (true);
create policy public_read on products        for select to anon, authenticated using (true);
create policy public_read on fresh_generics  for select to anon, authenticated using (true);
create policy public_read on prices_current  for select to anon, authenticated using (true);
create policy public_read on price_history   for select to anon, authenticated using (true);
create policy public_read on search_synonyms for select to anon, authenticated using (true);
-- Solo las equivalencias aprobadas son públicas
create policy public_read_approved on fresh_mappings for select to anon, authenticated using (status = 'approved' or is_admin());
-- El estado de las fuentes se muestra en la app ("Estado de los precios")
create policy public_read on ingest_runs     for select to anon, authenticated using (true);

-- Log anónimo de búsquedas: cualquiera inserta, solo el admin lee
create policy anon_insert on search_log for insert to anon, authenticated with check (true);
create policy admin_read  on search_log for select to authenticated using (is_admin());

-- Admin
create policy admin_all on fresh_mappings  for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on fresh_generics  for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on search_synonyms for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all on category_map    for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_read on chain_products for select to authenticated using (is_admin());
create policy admin_read on admin_emails   for select to authenticated using (is_admin());

-- Tamaño de la base para el panel admin
create function db_size_bytes() returns bigint
  language sql stable security definer set search_path = public as $$
  select case when is_admin() then pg_database_size(current_database()) else null end
$$;
grant execute on function db_size_bytes() to authenticated;
