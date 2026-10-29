# Changuito — Puesta en marcha

## Lo que tenés que hacer vos (una sola vez)

### 1. Crear el proyecto en Supabase (gratis)
1. Entrá a https://supabase.com y creá un proyecto nuevo:
   - **Nombre:** `changuito`.
   - **Región:** South America (São Paulo).
   - **Contraseña de la base:** generá una fuerte y guardala.
2. Andá a **Project Settings → Database → Connection string** y copiá la de **Session pooler** (puerto 5432). Reemplazá `[YOUR-PASSWORD]` por tu contraseña. Ese texto es tu `DATABASE_URL`.
3. En **Authentication → Providers**, dejá habilitado solo **Email** (es el magic link del panel admin).

### 2. Crear el repo en GitHub (público)
1. Creá un repo **público** llamado `changuito`, sin README.
2. En **Settings → Secrets and variables → Actions → New repository secret**, cargá:
   - **Nombre:** `DATABASE_URL`.
   - **Valor:** el texto del paso 1.2.
3. Avisame y subo el código (o subilo vos con `git remote add origin …` y `git push -u origin main`).

### 3. Crear la base y la primera carga
1. En el repo: **Actions → migrate → Run workflow**. Crea las tablas, la seguridad y los datos fijos.
2. En Supabase, abrí el **SQL Editor** y registrá tu email como administrador:
   ```sql
   insert into admin_emails (email) values ('tu-email@gmail.com');
   ```
3. Corré la primera carga a mano:
   - **Actions → ingest-sepa → Run workflow.** Tarda unos 3 minutos.
   - **Actions → ingest-vtex → Run workflow** (modo `full`). Las 3 cadenas corren en paralelo y Carrefour tarda cerca de 1 hora.

Después de esto todo corre solo:

| Workflow | Cuándo corre (ART) |
|---|---|
| `ingest-vtex` | 09:00 (completo) y 18:00 (solo precios) |
| `ingest-sepa` | 14:00 y 20:00 |
| `maintenance` | 04:00 |

Si algo falla, GitHub te manda un mail.

## Desarrollo local (sin Docker)

```bash
npm install
```

Base local con PGlite (Postgres en WebAssembly). Dejala corriendo en una terminal:

```bash
npm run db:local
```

En otra terminal, con `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres`, aplicá las migraciones:

```bash
npm run db:migrate
```

Prueba de ingesta con 2 categorías y control de calidad:

```bash
node ingest/vtex/run.ts --chain=comodin --mode=full --max-categories=2 --validate=20
```

Ingesta de SEPA (baja el archivo del día):

```bash
node ingest/sepa/run.ts
```

Tests:

```bash
npm test
```
