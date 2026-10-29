# Changuito — Informe de la Fase 0 (validación técnica)

- **Fecha:** 29/10/2026
- **Datos usados:** catálogos web completos de Carrefour, ChangoMás y Comodín leídos con la región Tucumán (CP 4000), simulaciones de carrito y el ZIP de SEPA del miércoles 28/10 (más el del martes 27/10 para comparar).
- **Scripts:** todos están en esta carpeta (`phase0/`). Los datos crudos quedaron en `phase0/out/`.

## Resumen

Las 6 cadenas son viables. Aparecieron **5 diferencias con el plan** que conviene corregir antes de la Fase 1:

1. **Comodín también necesita la cookie de región.** Sin ella, algunos precios son de otra zona (ej.: queso cremoso Ricrem $9.487 sin cookie y $7.490 en Tucumán).
2. **El precio del catálogo VTEX no es confiable por sí solo.** El precio que hay que guardar es el de la **simulación de carrito**.
3. **Las promos de ChangoMás no aparecen en el catálogo.** Solo se ven en la simulación de carrito.
4. **Vea y Jumbo no informan promos en SEPA.** Contradice la decisión Q39.
5. **El precio web de ChangoMás corresponde solo al Hiper de Camino del Perú.** Las otras 3 sucursales de ChangoMás tienen precios distintos.

También hubo una buena noticia: **las 8 sucursales de Vea del Gran SMT tienen exactamente los mismos precios**, y lo mismo pasa con las 2 de La Anónima. Por eso "Mi sucursal" deja de ser necesaria.

---

## 1. Webs VTEX (Carrefour, ChangoMás, Comodín)

### 1.1 Región
| Cadena | Cookie `vtex_segment` | Resultado |
|---|---|---|
| Carrefour | Necesaria | Con la cookie, el precio coincide con la simulación de carrito con CP 4000 |
| ChangoMás | Necesaria | Igual que Carrefour, pero el catálogo a veces devuelve un precio que no es de Tucumán (ver 1.2) |
| Comodín | **Necesaria** (el plan decía que no) | Sin la cookie, algunos productos traen precio de otra zona |

En todos los casos el vendedor es "1" (la tienda principal). La simulación de carrito con `postalCode: 4000` devuelve el precio correcto aun sin la cookie.

### 1.2 Catálogo vs. simulación de carrito
Recorrí la categoría Lácteos completa de cada cadena y simulé el carrito para cada producto disponible:

| Cadena | Productos disponibles | Precio de catálogo distinto al del carrito |
|---|---|---|
| Carrefour | 865 | 10% (casi todo explicado por promos) |
| ChangoMás | 520 | 7% (precios de otra región o desactualizados, en los dos sentidos) |
| Comodín | 483 | 2% (pesables) |

**Conclusión:** el catálogo sirve para **descubrir productos** (nombre, EAN, imagen, categoría, disponibilidad). El **precio** se toma de la simulación de carrito:
- Se usa el campo `price` (precio de lista por unidad, o por kg en los pesables).
- Se simula en lotes de hasta 100 ítems con CP 4000.

### 1.3 Promos: cómo detectarlas
- **Carrefour:**
  - Los textos de `Teasers` y `DiscountHighLight` se pueden interpretar ("2do al 50% Max 24 unidades Combinable LA SERENISIMA", "25% Off").
  - El descuento directo ya viene aplicado en el precio.
- **ChangoMás:** el catálogo no trae promos (0 de 520) e Intelligent Search tampoco. Solo aparecen al simular con cantidad 2 o 3:
  - 2do al 70%: 72 productos.
  - 2do al 50%: 29.
  - 3x2: 22.
  - 2x1: 19.
- **Comodín:** solo descuentos directos (15–35%), visibles en el catálogo.

**Problema encontrado:** las promos "Combinable" se aplican entre productos distintos de la misma marca. En un lote grande, un producto de La Serenísima con cantidad 1 "recibe" el 2do al 50% gracias a otro de la misma marca.
- **Solución probada:** armar lotes donde no se repita la marca ni la categoría.
- **Resultado contra la simulación individual de cada producto:** 40 de 40 coinciden en Carrefour y 39 de 40 en ChangoMás.

**Método propuesto para la ingesta:**
1. Simular con cantidad 2 y con cantidad 3, en lotes "aislados" (sin marca ni categoría repetidas).
2. Clasificar cada producto comparando el total con el precio de lista `P`:
   - `t2 = 2P(1−d)` y `t3 = 3P(1−d)`: descuento directo `d`.
   - `t2 < 2P` y `t3/3 > t2/2`: 2do al X%.
   - `t2 = 2P` y `t3 < 3P`: 3x2 o 3ro al X%.
3. En Carrefour, completar con el texto del teaser.

Las promos combinables entre productos distintos no se aplican al calcular la lista. Es la opción conservadora: puede subestimar el ahorro, pero nunca lo inventa.

### 1.4 Pesables
- Cuando `measurementUnit = kg`, el `Price` es el **precio por kg**.
- `unitMultiplier` es el paso de venta (0,25 kg, 0,5 kg…).
- En la simulación, `sellingPrice` = precio por kg × `unitMultiplier`.

### 1.5 Otros datos útiles
- **Precio por unidad:**
  - Carrefour trae `pricePerUnit`.
  - ChangoMás trae los campos "Gramaje" en el 92% de los productos.
  - Comodín no trae nada: hay que parsearlo del nombre.
- **Nombres con errores:** algunos nombres de Carrefour pierden la coma ("Aceite … **15 l**" es 1,5 L). Hay que parsear con cuidado y validar contra el campo "Gramaje".
- **Productos sin stock:** Carrefour muestra 40.187 productos de súper, pero solo **10.881 están disponibles en Tucumán**. Los no disponibles pueden traer el precio nacional: se descartan.

### 1.6 Volumen y tiempos (catálogo completo, 1 pedido por segundo)
| Cadena | En catálogo | Disponibles en Tucumán | Pesables | Pedidos | Tiempo |
|---|---|---|---|---|---|
| Carrefour | 40.187 | **10.881** | 280 | 923 | 25 min |
| ChangoMás | 22.642 | **8.706** | 81 | 506 | 12 min |
| Comodín | 6.140 | **5.180** | 159 | 143 | 5 min |

A esto hay que sumarle la simulación de carrito:
- Con cantidades 2 y 3, en lotes aislados, se estiman entre 15 y 35 minutos más por cadena.
- Una corrida completa de Carrefour quedaría cerca de 1 hora. Entra en el límite de 6 horas por job de GitHub Actions.

**Optimización para la Fase 1:** el catálogo completo se recorre 1 vez por día. La segunda corrida diaria solo re-simula precios de los productos ya conocidos.

---

## 2. SEPA (datos oficiales)

### 2.1 El archivo
- Pesa 322 MB y baja en unos 30 segundos.
- Filtrar Tucumán toma 75 segundos en Python. El resultado son 23 MB de CSV para el Gran SMT.
- Trae 16 ZIP internos, uno por empresa. **Uno vino vacío (0 bytes) los dos días revisados** (`comercio-sepa-36`): el lector tiene que saltearlo y avisar.
- En CKAN, `last_modified` aparece todos los días cerca de las 16:20. Hay que confirmar si esa hora es local o UTC. Mientras tanto, conviene correr la ingesta a las 14:00 y a las 20:00 ART, siempre controlando `last_modified`.

### 2.2 Qué hay en Tucumán
| Empresa | Bandera | Sucursales en el Gran SMT | Productos por sucursal | Promos |
|---|---|---|---|---|
| Cencosud | Vea | 8 (+3 en el interior: Monteros, Concepción, Alberdi) | 3.900–5.900 | **Ninguna** |
| Cencosud | Jumbo | 1 (Fermín Cariola 42, Yerba Buena) | 6.856 | **Ninguna** |
| La Anónima | La Anónima | 2 (Hipermercado Tucumán 1 y 2) | 6.700–7.500 | ~28% de los productos |
| Dorinka (Walmart) | ChangoMás / HiperChangomas | 4 | ~25.400 | Ninguna |
| INC | Carrefour Hiper + 3 Market | 4 | 6.700–16.300 | ~7% |

- **Comodín:** está en SEPA, pero con una sola sucursal en Jujuy. En Tucumán no informa. Queda solo con su web, como estaba previsto.
- **Gómez Pardo, Aledo, El Marqués y Capo:** no aparecen. Siguen como "próximamente".
- **Vea:** las 11 sucursales de la provincia están en SEPA. La prensa hablaba de 3 cierres (Córdoba, Colón y Tafí Viejo), y esas no figuran.

### 2.3 Precios iguales entre sucursales
| Bandera | Resultado |
|---|---|
| Vea (8 sucursales del Gran SMT) | **100% igual** en los productos en común |
| La Anónima (2) | **100% igual** |
| ChangoMás 1106 vs. 1033 | 100% igual |
| ChangoMás 1082 vs. 1033 | 96% igual |
| Carrefour Market | 96–99% igual entre sí |

Lo que sí cambia entre sucursales es el **surtido**: una sucursal chica de Vea tiene 3.900 productos y una grande 5.900.

### 2.4 Web vs. SEPA (misma cadena, mismo EAN)
| Comparación | EAN en común | Precio igual |
|---|---|---|
| Carrefour web vs. Hiper Tucumán (#46) | 9.048 | **91%** |
| Carrefour web vs. Market Tucumán I | 6.442 | 89% |
| ChangoMás web vs. **Hiper Camino del Perú** (#1020) | 6.047 | **76%** (casi todo el resto son promos de la web) |
| ChangoMás web vs. Changomas Río Salí (#1033) | 6.044 | **30%** |

**Conclusión:** la web de ChangoMás refleja el precio del Hiper de Camino del Perú. Las otras 3 sucursales (Río Salí, Av. Jujuy y Ejército del Norte) tienen otra lista de precios. Lo mismo vale para la simulación de carrito, que es la fuente que propongo.

### 2.5 Frescos en SEPA
| Grupo | Vea / Jumbo | La Anónima |
|---|---|---|
| Verdulería | Prácticamente nada (lechuga, manzana y naranja: 0; tomate y banana: solo productos que no son frescos) | Parcial, algunos por kg (banana, nalga, tapa de nalga) |
| Fiambres al corte | Por kg (jamón cocido Paladini $29.290/kg) | Solo envasados |
| Carnes | Algunos cortes (Jumbo: tapa de nalga $14.999/kg) | Algunos cortes |

ChangoMás y Carrefour tienen buena cobertura en sus webs. Ejemplos de ChangoMás: 46 productos de vacío y 23 de tomate por kg.

**Riesgo para el criterio "150 frescos en 3 o más supers":** en verdulería, el tercer super casi siempre va a ser Comodín o La Anónima. Es alcanzable, pero justo.

### 2.6 Datos sucios a normalizar
- **Cencosud:** informa `cantidad_presentacion` en kg con la etiqueta "gr." (".52 gr." quiere decir 520 g).
- **Promos de La Anónima:** vienen como leyendas libres. Las más comunes:
  - "25% de descuento con cualquier medio de pago": se trata como descuento directo.
  - "Llevando 2 unidades": el precio unitario de la promo ya viene informado.
- **Promos de Carrefour en SEPA:** dicen "Promo A válida desde…" y no detallan el tipo.

---

## 3. Base de datos

| Dato | Plan | Medido |
|---|---|---|
| Productos canónicos (EAN universales, 6 cadenas) | 40.000–60.000 | **22.169** |
| Filas de precios actuales | ~200.000 | **~44.000** agrupando por zona; ~85.000 con todas las sucursales de SEPA |
| Productos presentes en las 6 cadenas | — | 452 |
| Productos en 3 o más cadenas | — | 5.914 |

**Estimación de tamaño:**
- Catálogo y precios actuales: unos 25 MB.
- Historial de 60 días (insertando solo cuando cambia el precio, suponiendo que cambia ~8% de los precios por día): unas 210.000 filas, entre 25 y 35 MB.

**Total estimado: menos de 100 MB de los 500 MB.** Sobra lugar: se puede guardar historial de 90 días o más.

---

## 4. Ajustes propuestos al plan

| # | Cambio | Motivo |
|---|---|---|
| A1 | Comodín usa la cookie de región igual que las otras dos | 1.1 |
| A2 | Precio VTEX = simulación de carrito (lotes aislados, cantidades 2 y 3). El catálogo queda solo para descubrir productos | 1.2 y 1.3 |
| A3 | Las promos de ChangoMás se detectan solo por simulación. Las combinables entre productos no se aplican | 1.3 |
| A4 | Se elimina "Mi sucursal" de la v1: Vea y La Anónima tienen un solo precio. La agrupación en "zona de precios" se hace automáticamente en la ingesta y se reactiva si algún día difieren | 2.3 |
| A5 | Vea y Jumbo van sin promos (SEPA no las informa). La app lo aclara | 2.2 |
| A6 | ChangoMás se muestra como "ChangoMás (Hiper Camino del Perú)" | 2.4. **Decisión pendiente**: ver abajo |
| A7 | Ingesta de SEPA a las 14:00 y 20:00 ART, salteando ZIP internos rotos | 2.1 |
| A8 | Las tablas de categorías se arman con los árboles reales (`out/tree.json`): Carrefour 12, ChangoMás 13 y Comodín 13 categorías de súper | 1.6 |
| A9 | Historial de 90 días en lugar de 60 (hay espacio de sobra) | 3. Opcional |
| A10 | Corrida VTEX: catálogo completo 1 vez por día y solo re-simulación de precios en la segunda corrida | 1.6 |

### Decisiones que necesito de vos
1. **Precio "Mi Carrefour" (Mi CRF).** Carrefour aplica descuentos del programa Mi Carrefour (4–26%) en la web y en el carrito sin iniciar sesión. En el local, hay que identificarse como socio (es gratis).
   - **Opción a:** usar ese precio y marcarlo "con Mi Carrefour".
   - **Opción b:** ignorarlo y usar el precio sin el descuento.
2. **ChangoMás tiene 2 listas de precios en Tucumán.**
   - **Opción a:** usar solo la web, que corresponde al Hiper Camino del Perú y trae promos.
   - **Opción b:** sumar las otras 3 sucursales desde SEPA. Saldrían sin promos y volvería "Mi sucursal" solo para ChangoMás.
