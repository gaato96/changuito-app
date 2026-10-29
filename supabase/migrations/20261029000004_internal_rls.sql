-- La tabla de control de migraciones no debe verse desde la API pública de Supabase.
create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now());
alter table schema_migrations enable row level security;
