# Changuito — Plan completo

PWA gratuita para comparar precios de supermercados del Gran San Miguel de Tucumán, armar listas de compras y saber en qué super conviene comprar y cuánto se ahorra exactamente.

- **Fecha del plan:** 16/10/2026 (actualizado el 29/10/2026 con los resultados de la Fase 0, ver `phase0/INFORME_FASE0.md`)
- **Estado (29/10/2026):**
  - Fases 0 a 4 programadas.
  - Datos en Supabase, cargándose a diario por GitHub Actions.
  - App lista para publicar en Vercel; los pasos están en `SETUP.md`.
  - Pendientes del dueño: aprobar las equivalencias de frescos en `/admin`, publicar en Vercel y probar en Android y iPhone.
  - Diseño mobile en Stitch (`stitch_changuito_design_system_sheet/`) y admin en `design/admin/`.
- **Restricción principal:** costo cero. Todo corre en planes gratuitos.

---

## 1. Alcance

### 1.1 Usuarios
- Uso real: el dueño del proyecto y sus conocidos. El link es público, pero sin lanzamiento formal ni beta.
- Sin login para usuarios. Solo el administrador inicia sesión.

### 1.2 Zona
Gran San Miguel de Tucumán: Capital, Yerba Buena, Tafí Viejo, Banda del Río Salí y Las Talitas. El resto de la provincia queda fuera de la v1.

### 1.3 Supermercados de la v1

| Cadena | Fuente | Frecuencia | Precio |
|---|---|---|---|
| Carrefour | Web (VTEX), región Tucumán | 2 veces por día | Único para Tucumán (91% igual al Hiper Tucumán en SEPA). Incluye descuentos "Mi Carrefour", marcados |
| ChangoMás | Web (VTEX), región Tucumán | 2 veces por día | El de la web = **Hiper Camino del Perú**. Las otras 3 sucursales tienen otra lista (se muestra aclarado) |
| Comodín | Web (VTEX), comodinencasa.com.ar, **con cookie de región** | 2 veces por día | Único para Tucumán |
| Vea | Datos oficiales SEPA | 1 vez por día | Único: las 8 sucursales del Gran SMT tienen el mismo precio. **Sin promos** (SEPA no las informa) |
| Jumbo | Datos oficiales SEPA | 1 vez por día | 1 sucursal (Fermín Cariola 42, Yerba Buena). **Sin promos** |
| La Anónima | Datos oficiales SEPA (respaldo: su web) | 1 vez por día | Único: las 2 sucursales (Hipermercado Tucumán 1 y 2) tienen el mismo precio |

**Fuera de la v1:**
- Día: no tiene sucursales en Tucumán.
- Gómez Pardo, Aledo, El Marqués y Capo: no publican precios ni en web ni en SEPA. Se muestran como "próximamente".
- Mayoristas: Makro, Maxiconsumo, Basualdo, Vital, Yaguar y el precio mayorista de Maxi Comodín.

### 1.4 Funciones de la v1
1. **Búsqueda por nombre** con autocompletado, más **10 categorías unificadas**: Almacén, Lácteos, Carnes, Verdulería, Fiambrería, Panadería, Bebidas, Limpieza, Perfumería, Bebés/Mascotas.
2. **Ficha de producto:**
   - Precio en cada super, con fecha y hora de actualización.
   - Precio por kg o litro.
   - Promo vigente.
   - Historial de 60 días.
3. **Productos exactos** reconocidos por código de barras (EAN). Si en un super hay una alternativa más barata de la misma categoría y tamaño, se avisa.
4. **Frescos:** unos 200 genéricos (ej. "tomate redondo", "nalga", "jamón cocido feteado") comparados por precio por kg. Las equivalencias las propone el sistema y las aprueba el administrador.
5. **Listas:**
   - Varias listas por persona, guardadas en el dispositivo.
   - Cantidades por producto (unidades o kg).
   - Compartir por WhatsApp con un link que abre la app con la lista cargada.
6. **Comparación de la lista:**
   - **Un solo super:** ranking de supers con cobertura ("tiene 18 de 20"), total y ahorro exacto contra cada uno de los otros.
   - **Repartido en 2 supers:** la mejor combinación y cuánto ahorra contra el mejor super único.
   - Promos por cantidad aplicadas según la cantidad que lleves.
7. **Sugerencias de promo:** "Si llevás 2, cada uno te sale $X; ahorrás $Y". Solo sugiere; no modifica la lista.
8. **Modo compra:** elegís el super, la lista se ordena por sector y vas tachando.
9. ~~**Mi sucursal**~~: **eliminada de la v1** (Fase 0). Vea y La Anónima tienen el mismo precio en todas sus sucursales del Gran SMT. La ingesta agrupa sucursales en "zonas de precio" automáticamente; si algún día una cadena tiene más de una zona, se reactiva la elección.
   - **Precio "Mi Carrefour":** se usa el precio con el descuento del programa (lo cobra la web sin iniciar sesión) y se marca con un chip "con Mi Carrefour", porque en el local hay que identificarse como socio.
   - **ChangoMás:** se nombra "ChangoMás (Hiper Camino del Perú)" y Ajustes aclara que las otras sucursales pueden tener precios distintos.
10. **Uso sin internet:** se ven las listas y los últimos precios descargados.
11. **Aviso de precios viejos:** si una fuente no actualiza, la app muestra "precios de hace X días".
12. **Aviso legal visible:** "Precios tomados de las webs oficiales y de datos públicos (SEPA) el [fecha]. Pueden diferir en el local." Los supers aparecen como texto, sin logos.
13. **Medición sin cookies:** Vercel Web Analytics más registro anónimo de búsquedas.

### 1.5 Fuera de la v1 (fases posteriores)
- Descuentos bancarios y de billeteras (eligiendo tus tarjetas y el día).
- Modo "cualquier marca" (leche entera 1 L de la marca más barata en cada super).
- Escáner de código de barras con la cámara.
- Alertas de baja de precio (web push).
- Login con Google para sincronizar listas.
- Registro de "cuánto ahorré".
- Supers sin web (carga manual o foto del ticket) y modo mayorista.
- Resto de la provincia.
- Dominio propio.

---

## 2. Arquitectura

```
┌───────────────────────── GitHub (repo público) ─────────────────────────┐
│  GitHub Actions (cron)                                                    │
│   ├─ ingest-vtex   09:00 y 18:00 ART → Carrefour, ChangoMás, Comodín      │
│   ├─ ingest-sepa   11:00 y 15:00 ART → Vea, Jumbo, La Anónima (si hay     │
│   │                                     archivo nuevo)                    │
│   └─ maintenance   diario → historial, limpieza > 60 días, chequeo de     │
│                              fuentes, keep-alive                          │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ service_role (secreto de Actions)
               ▼
┌──────────── Supabase (Free) ────────────┐        ┌──── Vercel (Hobby) ────┐
│ Postgres 500 MB: catálogo, precios,     │◄──────►│ Next.js (App Router)   │
│ historial, frescos, logs                 │  anon  │ PWA + rutas API        │
│ Auth: magic link solo para admin         │  (RLS) │ changuito-tuc.vercel.app│
└──────────────────────────────────────────┘        └───────────┬───────────┘
                                                                │
                                                     Teléfono: PWA instalada,
                                                     listas en IndexedDB,
                                                     caché offline (service worker)
```

### 2.1 Stack
- **Frontend y API:** Next.js (App Router) + TypeScript + Tailwind. PWA con service worker (Serwist), manifest e íconos.
- **Base de datos:** Supabase Postgres con extensiones `pg_trgm` y `unaccent` para la búsqueda.
- **Auth:** Supabase Auth con magic link, limitado a un email administrador.
- **Ingesta:** scripts Node/TypeScript en `/ingest`, ejecutados por GitHub Actions.
- **Hosting:** Vercel Hobby, en el subdominio gratuito.
- **Gráficos:** Recharts o un SVG simple para el historial.
- **Almacenamiento local:** IndexedDB (con `idb`) para listas, sucursales elegidas y últimos precios.

### 2.2 Estructura del repositorio
```
changuito/
├─ app/                  # Next.js (pantallas + API routes)
├─ components/
├─ lib/                  # cálculo de ahorro, promos, normalización
├─ ingest/
│  ├─ vtex/              # lector VTEX genérico + config por cadena
│  ├─ sepa/              # descarga y filtrado del ZIP oficial
│  ├─ laanonima/         # respaldo HTML
│  └─ shared/            # EAN, unidades, categorías, upsert
├─ supabase/migrations/  # esquema SQL versionado
├─ data/
│  ├─ frescos.csv        # ~200 genéricos semilla
│  └─ categorias.json    # mapeo categoría de cada cadena → 10 categorías
└─ .github/workflows/
```

### 2.3 Seguridad
- La ingesta se conecta directo a Postgres con `DATABASE_URL` (connection string del pooler de Supabase), que vive solo en los secretos de GitHub Actions. Nunca va en el código, porque el repo es público. Reemplaza a la clave `service_role`: permite escrituras masivas más rápidas.
- La app pública usa la clave `anon` con RLS: lectura de catálogo y precios; escritura solo del log anónimo de búsquedas.
- El panel de administración verifica el email contra una lista permitida, tanto en RLS como en el servidor.
- No se guardan IP ni datos personales en el log de búsquedas.

---

## 3. Fuentes de datos (detalle técnico verificado el 16/10/2026)

### 3.1 VTEX: Carrefour, ChangoMás, Comodín
- **Región Tucumán:**
  1. `GET /api/checkout/pub/regions?country=ARG&postalCode=4000` devuelve el `regionId`.
  2. Las consultas se hacen con la cookie `vtex_segment` = base64 de `{"regionId":"<id>","channel":"1"}`.
  - Pasar `regionId` como parámetro del catálogo clásico **no funciona**.
  - Carrefour y ChangoMás también aceptan Intelligent Search con `regionId`. Comodín no (da 404), así que va por catálogo clásico con cookie.
  - **Fase 0:** Comodín también necesita la cookie (sin ella algunos precios son de otra zona).
- **Fuente del precio (Fase 0):** el catálogo devuelve un precio distinto al del carrito en el 2–10% de los productos. Por eso:
  - El **catálogo** sirve para descubrir productos: nombre, EAN, imagen, categoría y disponibilidad.
  - El **precio** sale de la simulación de carrito (`/api/checkout/pub/orderForms/simulation`, CP 4000, vendedor "1"), en lotes de hasta 100 ítems. Se toma el campo `price` como precio de lista.
  - Los lotes son **"aislados"**: sin marcas ni categorías repetidas, porque las promos "Combinable" se mezclan entre productos de una misma marca. Contra la simulación individual coincidieron 79 de 80 productos.
  - Se simula con cantidad 2 y con cantidad 3 para detectar promos (ver 5.2). Es la **única** forma de ver las promos de ChangoMás.
  - Los pesables (`measurementUnit = kg`) traen el precio por kg. `unitMultiplier` es el paso de venta.
  - Se descartan los productos no disponibles: traen el precio nacional.
- **Volumen medido:**
  - Disponibles en Tucumán: Carrefour 10.881, ChangoMás 8.706 y Comodín 5.180.
  - Recorrer el catálogo completo lleva 25, 12 y 5 minutos.
  - El catálogo completo se recorre 1 vez por día. La segunda corrida solo re-simula precios.
- **Recorrido del catálogo:**
  - Árbol de categorías desde `/api/catalog_system/pub/category/tree/3`.
  - Por cada categoría de supermercado, páginas de 50 ítems (`_from` / `_to`).
  - Límite: `_from` no puede pasar de 2.500. Las categorías más grandes se recorren por sus subcategorías.
  - El header `resources: 0-49/N` da el total.
  - Solo categorías de súper: se excluyen electro, hogar, textil, etc.
- **Campos a guardar:**
  - `items[].ean`.
  - Precios: `commertialOffer.Price` (actual) y `PriceWithoutDiscount` (lista).
  - Disponibilidad: `IsAvailable`.
  - Imagen: `images[0].imageUrl` (se enlaza directo, no se copia).
  - Promos según la cadena: `Teasers`, `PromotionTeasers` o `DiscountHighLight`.
- **Precio por unidad según la cadena:**
  - Carrefour: `pricePerUnit`.
  - ChangoMás: campos "Gramaje".
  - Comodín: no trae; se calcula parseando el nombre ("500gr", "1,5 L", "x 6 u").
- **Promos de tarjeta:** se ignoran en la v1. Teasers con BINs bancarios, como "Tarjeta Carrefour 15%", quedan para la fase de descuentos bancarios.
- **Uso responsable:**
  - 1 pedido por segundo por sitio, con reintentos con backoff.
  - User-agent identificable.
  - En las pruebas no hubo bloqueos (unos 12 pedidos seguidos por sitio).
- **Verificación de región:** en cada corrida se simula un carrito (`/api/checkout/pub/orderForms/simulation`) con 3 EAN testigo y CP 4000. Si el precio no coincide con lo leído, la corrida se marca como fallida.

### 3.2 SEPA (datos oficiales): Vea, Jumbo, La Anónima
- **Publicación:**
  - Dataset CKAN `sepa-precios` en datos.produccion.gob.ar.
  - Metadatos: `/api/3/action/package_show?id=sepa-precios`.
  - Hay 7 archivos rotativos (`sepa_lunes.zip` … `sepa_domingo.zip`), uno por día.
  - Licencia CC-BY 4.0. Hay que citar la fuente en la app.
- **Tamaño:** entre 310 y 330 MB por día para todo el país. El runner de GitHub lo baja, lo descomprime en streaming y filtra.
- **Estructura del ZIP:** carpeta de fecha → un ZIP por comercio → `comercio.csv`, `sucursales.csv` y `productos.csv`, separados por `|`.
- **Filtro:**
  - Sucursales con provincia `AR-T` y localidad dentro del Gran SMT.
  - Comercios Vea, Jumbo y La Anónima. Se identifican por nombre en `comercio.csv`; La Anónima corresponde a `2-1-382` y `2-1-383`.
- **Campos a guardar:**
  - `id_producto`, que es el EAN cuando `productos_ean = 1`.
  - Descripción, marca y `precio_unitario_bulto_por_unidad_venta_con_iva` (precio de lista).
  - `unidad_venta`.
  - Promo 1 y 2: precio y leyenda.
- **Cuándo se procesa:** el job consulta `last_modified` en CKAN y procesa solo si hay un archivo nuevo. Así no se duplica trabajo si se ejecuta 2 veces.
- **Respaldo de consulta puntual:** la API pública de Precios Claros (`d3e6htiiul5ek9.cloudfront.net/prod/producto?id_producto=<EAN>&array_sucursales=...`). Sirve para verificar precios; no es la fuente principal porque no está documentada.
- **Frescos en SEPA:** la cobertura es parcial. Hay banana, tomate perita y carne picada al vacío; no hay nalga ni jamón al corte. Cuando falta un dato se muestra "sin dato".

### 3.3 Respaldo de La Anónima (solo si SEPA falla 2 días seguidos)
- Se lee el HTML de `https://www.laanonima.com.ar/buscar/<término>` con la cookie `Id-Sucursal-Super=182` (Zona Norte) o `181` (Zona Sur) y `codigoPostal=4000`.
- Los precios están en los atributos `data-precio`, `data-precio_anterior` y `data-precio_oferta`.
- Requiere user-agent de navegador (con el de curl responde 403).
- Solo se consulta lo necesario: productos que están en alguna lista o que fueron buscados.

### 3.4 Resultados de la Fase 0 (29/10/2026)
- **Comodín y Gómez Pardo:**
  - Comodín (Alberdi S.A.) está en SEPA, pero solo con una sucursal en Jujuy. En Tucumán se cubre por su web.
  - Gómez Pardo no aparece.
- **Vea:** 8 sucursales en el Gran SMT, más 3 en el interior (Monteros, Concepción y Alberdi).
- **Precios por sucursal:** iguales al 100% entre todas las sucursales de Vea y entre las 2 de La Anónima.
- **Promos:**
  - Vea y Jumbo no informan promos en SEPA.
  - La Anónima informa promos en el ~28% de sus productos. Son leyendas libres, como "25% de descuento con cualquier medio de pago" y "Llevando 2 unidades".
- **Frescos en SEPA:**
  - Vea y Jumbo no tienen verdulería, pero sí fiambres al corte y algunos cortes de carne por kg.
  - La Anónima tiene una cobertura parcial.
- **El ZIP de SEPA:**
  - Trae ZIP internos vacíos (uno los dos días revisados): hay que saltearlos y avisar.
  - Cencosud informa la cantidad en kg con la etiqueta "gr." (".52 gr." = 520 g).
- **ChangoMás en SEPA:** el precio web coincide con el Hiper Camino del Perú (#1020). Las sucursales Río Salí, Av. Jujuy y Ejército del Norte tienen otra lista.
- **Publicación de SEPA:** CKAN publica el archivo diario cerca de las 16:20. La ingesta corre a las 14:00 y a las 20:00 ART y procesa solo si cambió `last_modified`.

---

## 4. Modelo de datos (Postgres)

```sql
chains           (id, slug, name, source: 'vtex'|'sepa', active, color)
stores           (id, chain_id, external_id, name, address, locality, lat, lng,
                  is_virtual)          -- cadenas web: 1 "tienda virtual Tucumán"
categories       (id, slug, name, sort_order, sector_order)   -- 10 unificadas
category_map     (chain_id, external_path, category_id)

products         (id, ean UNIQUE NULL, name, brand, size_value, size_unit,
                  category_id, image_url, kind: 'packaged'|'fresh',
                  search_tsv, name_norm)                      -- trigram index
chain_products   (chain_id, external_sku, product_id, raw_name, url,
                  last_seen_at)

fresh_generics   (id, name, unit: 'kg'|'unidad', category_id)
fresh_mappings   (generic_id, chain_id, external_sku, factor_to_unit,
                  status: 'suggested'|'approved'|'rejected', score)

prices_current   (store_id, product_id, price, list_price,
                  promo_kind, promo_min_qty, promo_value, promo_text,
                  loyalty,             -- null | 'mi_carrefour' (Fase 0)
                  unit_price, unit_label, available, source, captured_at)
                  PK (store_id, product_id)
price_history    (store_id, product_id, valid_from, price, promo_price)
                  -- se inserta SOLO cuando cambia el precio

ingest_runs      (id, source, chain_id, started_at, finished_at, status,
                  items_read, items_written, error)
search_log       (term_norm, results, created_at)            -- sin datos personales
```

### 4.1 Presupuesto de espacio (500 MB)
**Medido en la Fase 0:**
- Productos canónicos: 22.169.
- Precios actuales: unas 44.000 filas, agrupando por zona.
- Total estimado de la base: menos de 100 MB.

Por eso se puede ampliar el historial a 90 días si hace falta. Debajo queda la estimación original, como referencia:

- Catálogo de súper: entre 10.000 y 20.000 productos por cadena. Con EAN compartidos, se estiman entre 40.000 y 60.000 productos canónicos.
- Precios actuales:
  - 3 cadenas web × unos 15.000 = 45.000 filas.
  - SEPA: unas 10 sucursales × 15.000 = 150.000 filas.
  - Total aproximado de 200.000 filas: entre 40 y 70 MB con índices.
- Historial con inserción solo ante cambios: se estiman entre 1 y 2 millones de filas en 60 días, entre 100 y 200 MB.
- Medidas si se acerca al límite:
  1. Agrupar sucursales de Vea que tienen precios idénticos en una sola "zona de precios".
  2. Guardar historial solo de productos buscados o presentes en listas.
  3. Bajar el historial a 30 días.
- El job de mantenimiento mide el tamaño a diario y avisa al pasar 400 MB.

---

## 5. Lógica central

### 5.1 Reconocimiento de productos
- **Envasados:**
  - El EAN se normaliza a 13 dígitos.
  - Los códigos que empiezan con `2` son internos o pesables: no son universales y se tratan como candidatos a fresco.
  - Un EAN corresponde a un producto canónico. El nombre y la imagen se toman de la mejor fuente (prioridad: Carrefour > ChangoMás > Vea/Jumbo > el resto).
- **Talle y unidad:** se parsean del nombre y de los campos de cada fuente, y se normalizan a g, ml o unidades. Así se calcula el precio por kg o litro.
- **Frescos:**
  - `data/frescos.csv` trae unos 200 genéricos con unidad y categoría.
  - Para cada genérico, se proponen candidatos por cadena según tokens normalizados del nombre, categoría y venta por kg.
  - Cada candidato tiene un `factor_to_unit`. Ejemplo: "Tomate perita bandeja 0,4 kg" tiene factor 0,4, así que precio por kg = precio / 0,4.
  - El administrador aprueba o rechaza en el panel. Solo se usan las equivalencias aprobadas.
  - Los productos nuevos que llegan después generan sugerencias pendientes.

### 5.2 Promos
Se guardan normalizadas en `promo_kind`:
- `nth_pct`: "2da al 70%".
- `nxm`: "3x2".
- `qty_price`: "llevando 2, $X c/u".
- `pct`: descuento directo.
- `none`.

Las que no se pueden interpretar se muestran como texto y no se aplican al cálculo.

**Detección en VTEX (Fase 0):** sale de la simulación de carrito con cantidad 2 (`t2`) y cantidad 3 (`t3`), donde `P` es el precio de lista:
- Si `t2/2 = t3/3 < P`: descuento directo (`pct`).
- Si `t2 < 2P` y `t3/3 > t2/2`: 2do al X% (`nth_pct`).
- Si `t2 = 2P` y `t3 < 3P`: 3x2 (`nxm`) o 3ro al X%.

En Carrefour se completa con el texto del teaser. Los descuentos "Mi Carrefour" se guardan con una marca `loyalty = 'mi_carrefour'`.

Las promos "Combinable" entre productos distintos de la misma marca **no** se aplican. Es lo conservador: puede subestimar el ahorro, pero nunca lo inventa.

Para calcular el costo de llevar `q` unidades de un producto con promo:
- `nth_pct` (n, p%): grupos completos de n unidades = ⌊q/n⌋. En cada grupo, n−1 unidades a precio lleno y 1 con p% de descuento. El resto, a precio lleno.
- `nxm` (n x m): ⌊q/n⌋ grupos pagan m unidades cada uno. El resto, a precio lleno.
- `qty_price` (n, $x): si q ≥ n, cada unidad cuesta $x.
- Frescos por kg: costo = precio por kg × kg.

**Sugerencia de promo:** si llevar `q' > q` unidades hasta completar el mínimo baja el precio unitario efectivo, se muestra "Si llevás q' pagás $X ($Y c/u, ahorrás $Z)".

### 5.3 Comparación de la lista
Notación:
- `S` = las 6 cadenas, cada una con la sucursal elegida.
- `L` = la lista de ítems (producto o genérico, con cantidad).

1. **Costo por ítem y super:** `c[i][s]` = costo con promo aplicada, o "sin dato" si no hay precio vigente.
2. **Un solo super:**
   - `cobertura[s]` = cantidad de ítems con precio.
   - `total[s]` = suma de los `c[i][s]` disponibles.
   - Orden: primero mayor cobertura, después menor total.
3. **Ahorro exacto contra otro super:** se calcula **solo sobre los ítems que tienen los dos**, para que la comparación sea justa: `ahorro(s, t) = Σ c[i][t] − Σ c[i][s]` sobre esos ítems. Se muestra "Contra Vea ahorrás $X (en 18 productos que tienen los dos)".
4. **Repartido en 2 supers:**
   - Hay 15 pares posibles. Para cada par, cada ítem va al super más barato de los dos que lo tenga.
   - Cobertura = unión de lo que tienen los dos. Orden: cobertura y después total.
   - Se muestra el mejor par, con su ahorro contra el mejor super único (sobre los ítems comunes) y la lista dividida por super.
   - Si el ahorro es menor a un umbral configurable (por defecto $1.000 o 3%), se avisa "no vale la pena dividir".
5. **Alternativa más barata (solo aviso):** en el mismo super, un producto de la misma categoría, con talle de ±10% y precio por unidad menor.
6. **Precios viejos:** no se usan en el cálculo los precios con más de 72 horas, configurable. Cuentan como "sin dato" y se avisa.

Todo el cálculo corre **en el teléfono** con los precios descargados para los productos de la lista. Así es instantáneo y funciona sin internet.

---

## 6. Pantallas

1. **Bienvenida (primera vez):** presentación → listo. Los pasos de ubicación y "tus sucursales" quedan fuera de la v1 (Fase 0: hay un solo precio por cadena). Las pantallas ya diseñadas en Stitch se guardan para cuando haga falta.
2. **Inicio y búsqueda:**
   - Buscador con autocompletado (búsqueda tolerante a errores, sin acentos).
   - Grilla de 10 categorías.
   - Accesos a "Mis listas".
3. **Categoría:** listado con filtros (marca, orden por precio o por precio por unidad).
4. **Producto:**
   - Tabla de los 6 supers con precio, precio por unidad, promo, "actualizado hace X" y "sin dato" donde corresponda.
   - Gráfico de 60 días.
   - Botón "Agregar a lista" con cantidad.
5. **Mis listas:** crear, renombrar, duplicar, borrar y compartir.
6. **Lista:**
   - Ítems con cantidad (+/−, o kg para frescos).
   - Aviso de alternativa más barata.
   - Botón "Comparar".
7. **Comparación:**
   - Pestaña **Un super:** ranking con cobertura, total y ahorro contra cada uno.
   - Pestaña **Repartido en 2:** el mejor par, la lista dividida y el ahorro extra.
   - Detalle por ítem y sugerencias de promo.
8. **Modo compra:** elegir super → lista ordenada por sector → tachar → total parcial.
9. **Ajustes:** sucursales, acerca de, fuentes y licencia, aviso legal, borrar datos locales.
10. **Lista compartida:** el link abre una vista previa y el botón "Guardar en mis listas".
11. **Admin** (`/admin`, magic link):
    - Equivalencias de frescos pendientes (aprobar, rechazar, editar factor).
    - Estado de cada fuente (última corrida, ítems, errores).
    - Búsquedas sin resultados.
    - Tamaño de la base.

### 6.1 Diseño
- Primera propuesta mía, ajustada después sobre la app funcionando.
- Limpio, con verde para "ahorro", tipografía grande y legible dentro del super, modo oscuro y acciones al alcance del pulgar.
- Supers identificados con su nombre y un color neutro propio, sin logos.
- Textos en español rioplatense ("vos").

### 6.2 Uso sin internet y compartir
- **Service worker:**
  - Cachea la app.
  - Los últimos precios de los productos en listas se guardan en IndexedDB y se refrescan al abrir con conexión.
- **Compartir:**
  - La lista se codifica en la URL (`/l#<datos comprimidos>`): IDs de producto o genérico, más cantidades.
  - No hace falta servidor ni login.
  - Se envía por WhatsApp con `https://wa.me/?text=...`.

---

## 7. Automatización y monitoreo

| Workflow | Horario (ART) | Qué hace |
|---|---|---|
| `ingest-vtex` | 09:00 y 18:00 | Recorre Carrefour, ChangoMás y Comodín (una cadena por job, en paralelo), verifica la región, actualiza los precios actuales y el historial |
| `ingest-sepa` | 14:00 y 20:00 | Si hay archivo nuevo en CKAN: descarga, filtra Tucumán, actualiza Vea, Jumbo y La Anónima |
| `maintenance` | 04:00 | Borra historial de más de 60 días, recalcula sugerencias de frescos, mide el tamaño de la base, genera actividad para que nada se pause |

- **Fallas:** el job termina con error y GitHub manda un mail al dueño del repo. La app muestra la antigüedad de los precios de cada super.
- **Riesgo de GitHub:** desactiva los cron de repos públicos después de 60 días sin actividad. Mitigación: el job de mantenimiento hace un commit mensual de un archivo `status.json` con el resumen de las corridas.
- **Riesgo de Supabase:** pausa los proyectos Free inactivos. La ingesta diaria lo mantiene activo.
- **Tiempos estimados por corrida:** entre 10 y 25 minutos por cadena VTEX, y entre 5 y 10 minutos para SEPA. Sin límite de minutos por ser repo público.

---

## 8. Fases de trabajo

### Fase 0: Validación técnica (2–3 días)
- Leer una categoría completa de cada cadena VTEX con región Tucumán y comparar con la simulación de carrito.
- Bajar un ZIP SEPA minorista completo:
  - Listar comercios y sucursales de Tucumán.
  - Confirmar si Comodín o Gómez Pardo informan.
  - Medir la cobertura de frescos.
- Medir cantidad de productos y tamaño estimado en la base.
- **Resultado:** informe corto y ajustes al plan si algo no se confirma.

### Fase 1: Ingesta y base de datos (4–6 días)
- Proyecto Supabase, migraciones, RLS y semillas (cadenas, sucursales, categorías, frescos).
- Lector VTEX genérico con configuración por cadena, mapeo de categorías y parser de talles y promos.
- Lector SEPA en streaming con filtro Tucumán.
- Workflows de GitHub Actions y registro de corridas.
- **Resultado:** precios de los 6 supers en la base, actualizándose solos.

### Fase 2: App principal (5–7 días)
- Next.js + PWA, bienvenida y sucursales, búsqueda, categorías y ficha de producto con historial.
- Listas en IndexedDB y comparación (un super y repartido en 2) con promos y ahorro exacto.
- **Resultado:** se puede armar una lista real y ver dónde conviene.

### Fase 3: Frescos y panel de administración (3–4 días)
- Catálogo de unos 200 frescos, sugeridor de equivalencias y panel con magic link.
- Estado de fuentes y búsquedas sin resultado.
- **Resultado:** frescos comparables por kg.

### Fase 4: Terminaciones (3–4 días)
- Modo compra, compartir por WhatsApp, uso sin internet, sugerencias de promo y alternativa más barata.
- Aviso legal, analytics y estados vacíos y de error.
- Pruebas en Android y iPhone e instalación como app.
- **Resultado:** v1 lista para compartir con conocidos.

**Total estimado:** 3 a 4 semanas de trabajo, construyendo juntos con Claude Code.

### Fases posteriores (en orden sugerido)
1. Descuentos bancarios y de billeteras.
2. Escáner de código de barras.
3. Modo "cualquier marca".
4. Alertas de baja de precio.
5. Supers sin web (carga manual o foto del ticket).
6. Login y sincronización.
7. Registro de ahorro.
8. Resto de la provincia y modo mayorista.

---

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Una web cambia su estructura o su regionalización | Ese super deja de actualizar | Verificación con simulación de carrito, mail de error, aviso de precios viejos en la app |
| SEPA cambia formato, se demora o se discontinúa | Vea, Jumbo y La Anónima quedan sin precios | Detección de columnas por nombre, respaldo con la API de Precios Claros y el HTML de La Anónima |
| La base supera 500 MB | Supabase limita escrituras | Historial solo ante cambios, zonas de precio, medición diaria con alerta a 400 MB |
| GitHub desactiva el cron por inactividad | Dejan de actualizarse los precios | Commit mensual automático de `status.json` |
| Bloqueos anti-bot | Ese super deja de actualizar | 1 pedido por segundo, caché, solo categorías de súper, horarios de poco tráfico |
| Precio web ≠ precio en góndola (Carrefour, ChangoMás, Comodín) | Ahorro calculado inexacto | Aviso legal; ChangoMás coincide con SEPA; se audita con tickets reales en la Fase 4 |
| Promos mal interpretadas | Total incorrecto | Solo se aplican las promos reconocidas; el resto se muestra como texto |
| Términos de uso de los sitios / uso de marcas | Reclamo | Sin logos, aviso visible, cita de fuentes, tráfico mínimo; uso personal y no comercial |
| Vercel Hobby es solo no comercial | Habría que migrar si se monetiza | No aplica hoy; se revisa si cambia el objetivo |

---

## 10. Criterios de "terminado" para la v1
- Los 6 supers tienen precios con menos de 24 h de antigüedad en el 95% de los días.
- Una lista de 30 productos se compara en menos de 1 segundo en el teléfono.
- Para 10 productos testigo, el precio mostrado coincide con la web oficial o con Precios Claros del mismo día.
- Al menos 150 frescos tienen equivalencias aprobadas en 3 o más supers.
- La app se instala en Android y iPhone y abre listas y precios sin conexión.
- Costo mensual: $0.

---

## Anexo: decisiones tomadas en la entrevista

| # | Decisión |
|---|---|
| Q1 | Pública y gratuita, sin monetizar por ahora |
| Q2 | Solo Gran San Miguel de Tucumán |
| Q3 | Solo PWA, sin tiendas de apps |
| Q4 | Supers sin web, fuera de la v1 ("próximamente") |
| Q5 | Precio de lista + promos por cantidad; bancarios en una fase posterior |
| Q6 | Mejor super único + mejor combinación de hasta 2 |
| Q7 | Frescos incluidos en la v1, buscados por nombre |
| Q8 | Next.js + Supabase + Vercel |
| Q9 | Costo cero, todo gratis |
| Q10 | Webs actualizadas 2 veces por día, con fecha visible |
| Q11 | Sin login; listas en el dispositivo |
| Q12 | Subdominio gratuito de Vercel |
| Q13 | Repo público en GitHub |
| Q14 | Precio actual + 60 días de historial |
| Q15 | Unos 200 frescos curados, comparados por kg |
| Q16 | Productos exactos; "cualquier marca" en una fase posterior |
| Q17 | Ranking por cobertura y después por total |
| Q18 | Pensada para comprar en el local; sin costo de envío |
| Q19 | Nombre: Changuito |
| Q20 | Nombres sin logos + aviso legal |
| Q21 | Compartir por WhatsApp + uso sin internet en la v1; alertas después |
| Q22 | Panel de administración con magic link, solo para el dueño |
| Q23 | Estilo propuesto por Claude, ajustado por el dueño |
| Q24 | Escáner de código de barras en una fase posterior |
| Q25 | Búsqueda + 10 categorías unificadas |
| Q26 | Precio por kg o litro siempre visible |
| Q27 | Mail ante fallas + aviso de precios viejos |
| Q28 | Sin beta ni lanzamiento: uso propio y de conocidos |
| Q29 | Analytics sin cookies + log anónimo de búsquedas |
| Q30 | Mayoristas, fuera de la v1 |
| Q31 | Plan en `PLAN.md` |
| Q32 | Varias listas + modo compra |
| Q33 | Sugerencias de promo por cantidad |
| Q34 | Registro de ahorro, fuera de la v1 |
| Q35 | Fuentes mixtas (web + SEPA) |
| Q36 | 6 supers; Día afuera |
| Q37 | "Mi sucursal" por cadena, sugerida por cercanía |
| Q38 | SEPA 1 vez por día |
| Q39 | Promos de SEPA para Vea, Jumbo y La Anónima |
| Q40 | "Sin dato" cuando un super no tiene un fresco |
| Q41 | Diseño mobile en Google Stitch; el admin lo diseña Claude con la misma línea (29/10) |
| Q42 | Precio "Mi Carrefour" incluido y marcado (29/10) |
| Q43 | ChangoMás solo desde la web, presentado como Hiper Camino del Perú (29/10) |
| Q44 | Sin "Mi sucursal" en la v1; zonas de precio automáticas (29/10) |
| Q45 | Precio VTEX desde la simulación de carrito; promos detectadas por cantidad (29/10) |
