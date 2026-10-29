# Changuito — Puesta en marcha

Estado al 29/10/2026:
- **Supabase:** ya está creado y con las migraciones aplicadas.
- **Código:** está en https://github.com/gaato96/changuito-app.

Quedan 4 pasos, y todos los hacés vos desde el navegador.

---

## 1. Secreto de GitHub para las cargas automáticas

Las cargas diarias de precios corren en GitHub Actions y necesitan la conexión a la base.

1. Abrí https://github.com/gaato96/changuito-app/settings/secrets/actions
2. Tocá **New repository secret**.
3. Completá:
   - **Name:** `DATABASE_URL`
   - **Secret:** el mismo valor de `DATABASE_URL` que tenés en `.env.local` (la línea que empieza con `postgresql://postgres.`).
4. Tocá **Add secret**.

Para probarlo, andá a la pestaña **Actions** → **ingest-sepa** → **Run workflow**. Tiene que terminar en verde en unos 3 minutos.

Después todo corre solo:

| Workflow | Cuándo corre (hora argentina) |
|---|---|
| `ingest-vtex` | 09:00 (completo) y 18:00 (solo precios) |
| `ingest-sepa` | 14:00 y 20:00 |
| `maintenance` | 04:00 |

Si algo falla, GitHub te manda un mail.

---

## 2. Publicar la app en Vercel (gratis)

1. Entrá a https://vercel.com y tocá **Sign Up** → **Continue with GitHub**, con la cuenta `gaato96`. Elegí el plan **Hobby**, que es gratis.
2. Tocá **Add New… → Project**. En la lista vas a ver `changuito-app`: tocá **Import**.
3. En **Project Name** poné `changuito-tuc`. La dirección va a ser `https://changuito-tuc.vercel.app`; si ese nombre está tomado, Vercel te propone otro.
4. No cambies nada en *Framework*, *Build* ni *Root Directory*: se detectan solos.
5. Abrí **Environment Variables** y cargá estas 2. Los valores están en tu `.env.local`.

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | la línea `NEXT_PUBLIC_SUPABASE_URL=` de `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la línea `NEXT_PUBLIC_SUPABASE_ANON_KEY=` de `.env.local` |

   **No cargues `DATABASE_URL` en Vercel.** La app no la necesita, y así esa contraseña queda solo en GitHub.
6. Tocá **Deploy**. Tarda 1 o 2 minutos. Cuando termine, tocá **Visit**.

Desde ese momento, cada vez que se suba código a `main`, Vercel publica la versión nueva sola.

---

## 3. Configurar el ingreso al panel admin (magic link)

En Supabase (https://supabase.com/dashboard → proyecto `changuito`):

1. **Authentication → URL Configuration**
   - **Site URL:** `https://changuito-tuc.vercel.app` (o la dirección que te dio Vercel).
   - **Redirect URLs:** agregá `https://changuito-tuc.vercel.app/admin` y `http://localhost:3000/admin`.
   - Tocá **Save**.
2. **Authentication → Users → Add user → Send invitation**: poné tu email y tocá **Invite**. El panel no deja crear cuentas nuevas desde la app, así que tu usuario se crea por acá.
3. Avisame qué email usaste y lo registro como administrador. O registralo vos en el **SQL Editor**:
   ```sql
   insert into admin_emails (email) values ('tu-email@gmail.com');
   ```
4. Entrá a `https://changuito-tuc.vercel.app/admin`, poné tu email y abrí el link que te llega.

---

## 4. Instalar la app en tu teléfono

- **Android (Chrome):** abrí la dirección → menú ⋮ → **Agregar a la pantalla principal** o **Instalar app**.
- **iPhone (Safari):** abrí la dirección → botón Compartir → **Agregar a inicio**.

Una vez instalada, abre sin internet: muestra tus listas y los últimos precios descargados.

---

## Desarrollo local (sin Docker)

```bash
npm install
```

La app usa los accesos de `.env.local`:

```bash
npm run dev
```

Migraciones en la base de Supabase:

```bash
npm run db:migrate
```

Ingesta a mano de una cadena:

```bash
npm run ingest:vtex -- --chain=comodin --mode=full
```

Recalcular las sugerencias de frescos:

```bash
npm run frescos
```

Tests:

```bash
npm test
```

Para trabajar con una base local de prueba en vez de Supabase, levantá PGlite con `npm run db:local` y usá `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres`.
