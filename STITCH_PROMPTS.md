# Changuito — Prompts para Google Stitch

Basado en `PLAN.md` (16/10/2026). 25 pantallas + 1 hoja de sistema de diseño.

## Cómo usarlos

1. Creá un proyecto nuevo en Stitch en modo **Mobile** (salvo el bloque Admin, que va en **Web**).
2. Pegá primero el **Prompt 0 (sistema de diseño)**. Esa pantalla fija colores, tipografía y componentes.
3. Después pegá cada pantalla **en el mismo proyecto**, en orden, empezando siempre con el **bloque CONTEXTO** de abajo. Así Stitch mantiene la coherencia visual.
4. Generá una pantalla por prompt. Si una sale mal, corregila con prompts cortos ("make the price column larger", "move the CTA to a sticky bottom bar") en vez de regenerarla entera.
5. Los prompts están en inglés porque Stitch los interpreta mejor, pero **todo el texto de la interfaz está en español rioplatense** y tiene que quedar así.
6. Cuando termines, exportá cada pantalla (HTML/Tailwind o Figma) y pasámela: la uso como referencia para construir los componentes en Next.js.

---

## Bloque CONTEXTO (pegar al principio de cada prompt de pantalla)

```
CONTEXT — Changuito: a free mobile PWA to compare supermarket prices in Gran San Miguel de Tucumán, Argentina. Users build shopping lists and see which supermarket is cheapest and exactly how much they save. 6 supermarkets: Carrefour, ChangoMás, Comodín, Vea, Jumbo, La Anónima. Supermarkets are shown ONLY as text names with a small colored dot (never logos). All UI copy in Argentine Spanish using "vos" (e.g. "Agregá", "Elegí", "Llevás"). Prices in ARS with Argentine format: "$ 1.299,90" (dot for thousands, comma for decimals), always with tabular numerals. Follow the existing Changuito design system in this project exactly: same colors, fonts, radii, components and bottom navigation. Mobile 390px wide. Primary actions in the bottom third of the screen (thumb reach). Large, highly legible text — people use it while walking in a store aisle.
```

---

## Prompt 0 — Sistema de diseño

```
Design a mobile design system sheet for "Changuito", a free PWA that compares supermarket prices in Tucumán, Argentina, and shows exactly how much you save. Show it as one tall reference screen with labeled sections. All labels and sample copy in Argentine Spanish ("vos").

PERSONALITY: clean, calm, trustworthy, practical. Like a smart neighbor who knows where everything is cheaper. Not flashy, not a discount-flyer look. Generous whitespace, big readable numbers, savings as the hero.

COLOR TOKENS (light mode):
- Background: warm off-white #FAFAF7. Surface/cards: #FFFFFF. Subtle surface: #F1F2EE. Border: #E3E5DF.
- Text primary #161A17, secondary #5B625D, muted #8A918C.
- Brand / primary "Verde Changuito": #1F7A4D (buttons, active nav, links). Primary pressed #17603C. Primary tint #E3F2E9.
- Savings (ahorro): #15803D text on #DCFCE7 chips. Savings is always green and always prominent.
- Promo: amber #B45309 text on #FEF3C7 chip.
- Warning / stale prices ("precios de hace 3 días"): #C2410C on #FFEDD5.
- Error: #B91C1C on #FEE2E2.
- "Sin dato" (no data): gray #8A918C text, dashed #D4D7D1 border, no fill.
- Supermarket identity colors (muted, NOT their real brand colors, used only as a 10px dot + optional 3px left stripe): Carrefour #4E6A8C slate blue, ChangoMás #B07D2B ochre, Comodín #85587F plum, Vea #B4604A terracotta, Jumbo #5A5E9A indigo, La Anónima #7D6B5A taupe.

DARK MODE tokens (show a small dark-mode swatch row too): background #0F1412, surface #182019, subtle #212A23, border #2C362F, text #EEF1EC / #A9B2AB, primary #4CC38A, savings #4ADE80 on #14321F, promo #FBBF24 on #3A2A0A, warning #FB923C on #3A1E0C.

TYPOGRAPHY: headings "Plus Jakarta Sans" (600–800), body and numbers "Inter" with tabular numerals.
Scale: Display 32/38 bold (big totals), H1 24/30, H2 20/26, H3 17/22 semibold, Body 17/24 (larger than usual on purpose), Body small 15/20, Caption 13/18. Price large 28 bold, price in rows 18 semibold. Minimum text size 13.

SHAPE & SPACING: 4px grid, screen side padding 16. Card radius 16, buttons and inputs radius 12, chips fully rounded. Soft shadow only on floating elements (bottom sheets, sticky CTA bar); cards use 1px border, no shadow. Touch targets minimum 48px.

COMPONENTS to show, each labeled:
1. Buttons: primary filled (green, "Comparar lista"), secondary outlined ("Compartir"), tertiary text ("Ver más"), destructive text ("Borrar lista"), icon button. Full-width sticky bottom CTA bar example.
2. Search bar: large rounded field with magnifier icon, placeholder "Buscá un producto o marca".
3. Supermarket tag: colored dot + name ("● Carrefour"). Show all 6. Also a "Próximamente" muted tag for "Gómez Pardo".
4. Chips: savings "Ahorrás $ 2.340", promo "2da al 70%", "3x2", stale "Precios de hace 3 días", "Sin dato" (dashed), coverage "18 de 20 productos", category filter chips (selected/unselected).
5. Price row (the core component): supermarket tag on the left; on the right big price "$ 1.299,90", below it small unit price "$ 2.599,80 / kg" and caption "Actualizado hace 2 h". Variants: cheapest (green check + "Más barato" label), with promo chip, and "Sin dato" variant.
6. Product card (for lists/grids): product image placeholder 64px square on white, name in 2 lines ("Leche entera La Serenísima 1 L"), brand, "Desde $ 1.150 en ChangoMás", unit price.
7. Quantity stepper: − 2 + (48px buttons), and a kg variant "0,5 kg" with − / + in 0,25 kg steps.
8. List item row with stepper and a small inline warning "Hay una opción más barata en Vea".
9. Alert banners: info, warning (stale data), offline ("Sin conexión. Mostrando precios guardados el 28/10 18:00").
10. Bottom navigation, 4 tabs with icons + labels: "Inicio", "Buscar", "Listas", "Ajustes". Active tab green.
11. Bottom sheet with grabber handle.
12. Segmented tabs: "Un super" / "Repartido en 2".
13. Legal footnote style: caption gray "Precios tomados de las webs oficiales y de datos públicos (SEPA) el 29/10/2026. Pueden diferir en el local."
14. Empty state: simple line illustration of a small shopping cart (the "changuito"), title, one sentence, one button.

Icons: rounded line icons (Material Symbols Rounded style), 24px, 1.75 stroke look. App logo: wordmark "changuito" in lowercase Plus Jakarta Sans ExtraBold, green, with a tiny minimal shopping-cart glyph.
```

---

## Prompt 1 — Bienvenida 1: presentación

```
[CONTEXTO]

SCREEN: Onboarding step 1 of 3 — welcome. Shown only the first time.

Layout:
- Top: small "changuito" wordmark logo, centered. Step indicator dots (1 of 3) near the top right, plus a text button "Saltar".
- Middle: friendly simple line illustration of a small shopping cart with a price tag and a green checkmark.
- Title (H1): "Sabé dónde te conviene comprar".
- Body: "Compará precios de 6 supers de Tucumán, armá tu lista y mirá cuánto ahorrás, al peso."
- Three compact benefit rows with icons: "Precios actualizados todos los días", "Funciona sin internet en el super", "Gratis y sin cuenta".
- Below, a row of the 6 supermarket tags (colored dot + name) as small chips: Carrefour, ChangoMás, Comodín, Vea, Jumbo, La Anónima.
- Sticky bottom: full-width primary button "Empezar".
No bottom navigation on onboarding.
```

## Prompt 2 — Bienvenida 2: ubicación o barrio

```
[CONTEXTO]

SCREEN: Onboarding step 2 of 3 — location. Goal: find the user's nearest store branches.

Layout:
- Top: back arrow, step dots (2 of 3).
- Title: "¿Dónde hacés las compras?"
- Body: "Lo usamos solo para sugerirte las sucursales más cercanas. No guardamos tu ubicación."
- Big primary card-button with location icon: "Usar mi ubicación".
- Divider text "o elegí tu zona".
- Searchable field "Buscá tu barrio" and below it a list of selectable chips/rows grouped by locality: "San Miguel de Tucumán" (Centro, Barrio Norte, Barrio Sur, Villa Luján, Ciudadela), "Yerba Buena", "Tafí Viejo", "Banda del Río Salí", "Las Talitas". One row selected: "Yerba Buena" with green check.
- Caption at bottom: "Por ahora cubrimos el Gran San Miguel de Tucumán."
- Sticky bottom primary button "Continuar" (enabled).
```

## Prompt 3 — Bienvenida 3: tus sucursales

```
[CONTEXTO]

SCREEN: Onboarding step 3 of 3 — "Tus sucursales". Some chains have different prices per branch, so the user confirms one branch per chain.

Layout:
- Top: back arrow, step dots (3 of 3).
- Title: "Estas son tus sucursales"
- Body: "Vea y La Anónima tienen precios distintos según la sucursal. Te sugerimos las más cercanas."
- Card for "● Vea": selected branch "Vea Yerba Buena — Av. Aconquija 1500", distance "1,2 km", link "Cambiar".
- Card for "● La Anónima": "La Anónima Zona Norte", "3,8 km", link "Cambiar".
- Card for "● Jumbo": "Jumbo Yerba Buena — Fermín Cariola 42", note "Única sucursal".
- Compact info card: "Carrefour, ChangoMás y Comodín tienen un único precio para Tucumán." with the three tags.
- Caption: "Podés cambiarlas cuando quieras en Ajustes."
- Sticky bottom primary button "Listo, empezar".
Also show the "Cambiar" bottom sheet open for Vea in a second frame: list of branches with addresses and distances, radio selection.
```

## Prompt 4 — Inicio

```
[CONTEXTO]

SCREEN: Home ("Inicio"). Bottom navigation visible with "Inicio" active.

Layout top to bottom:
- Header: "changuito" wordmark left; right a small status pill "Precios al día" with green dot (tappable, shows freshness).
- Greeting H1: "¿Qué necesitás hoy?"
- Large search bar: "Buscá un producto o marca".
- Section "Mis listas" with "Ver todas" link: horizontal scroll of list cards. Card 1: "Compra del mes", "24 productos", savings chip "Ahorrás $ 8.420 en ChangoMás". Card 2: "Asado del domingo", "9 productos", "Mejor: Vea". Card 3: dashed outline "+ Nueva lista".
- Section "Categorías": 2-column grid (or 3-column) of 10 category tiles, each with a simple rounded line icon and name: Almacén, Lácteos, Carnes, Verdulería, Fiambrería, Panadería, Bebidas, Limpieza, Perfumería, Bebés y Mascotas. Tiles are white cards with border, icon in green tint circle.
- Section "Frescos por kilo" small promo card: "Compará carne, verdura y fiambre al peso" with "Ver frescos" link.
- Bottom: legal footnote caption "Precios tomados de las webs oficiales y de datos públicos (SEPA) el 29/10/2026. Pueden diferir en el local."
```

## Prompt 5 — Búsqueda con autocompletado

```
[CONTEXTO]

SCREEN: Search with autocomplete. Bottom nav "Buscar" active. Keyboard is open (show the bottom keyboard area as a gray block).

Layout:
- Top: search field focused with text "lech", clear (x) button and "Cancelar" text button.
- Suggestion list below (typo-tolerant, accent-insensitive):
  - Section "Productos": rows with 40px thumbnail, name with matched part in bold ("**Lech**e entera La Serenísima 1 L"), and right side "desde $ 1.150". 5 rows: Leche entera La Serenísima 1 L, Leche descremada Sancor 1 L, Leche en polvo Nido 800 g, Leche chocolatada Cindor 1 L, Lechuga criolla (with a small "Fresco · por kg" chip).
  - Section "Marcas": chips "La Serenísima", "Sancor", "Ilolay".
  - Section "Categorías": row "Lácteos" with icon.
- Below when not typing (show as a second frame of the same screen): "Búsquedas recientes" with clock icons and an "x" to delete each, and "Lo más buscado" chips: "Aceite", "Yerba", "Pañales", "Nalga", "Coca-Cola 2,25 L".
```

## Prompt 6 — Resultados de búsqueda y sin resultados

```
[CONTEXTO]

SCREEN: Search results for "yerba". Bottom nav "Buscar" active.

Layout:
- Top: search field with "yerba", below it "128 resultados".
- Horizontal filter row: sort chip "Ordenar: Precio por kg ▾", chip "Marca ▾", chip "Tamaño ▾", chip "Con promo".
- Vertical list of product cards: image left, name "Yerba mate Playadito 1 kg", brand caption, big "$ 4.890" with caption "en Comodín · el más barato", unit price "$ 4.890 / kg", small chip "Disponible en 6 supers". One card with promo chip "2da al 50%". One card showing "Disponible en 3 supers".
- Each card has a round "+" icon button on the right to add to a list quickly.

Second frame — empty results for "fernet branka 2 litros sin azucar": empty state with cart illustration, title "No encontramos eso", body "Probá con menos palabras o revisá cómo está escrito.", suggestions chips "Fernet Branca 750 ml", "Fernet Branca 1 L", and caption "Guardamos esta búsqueda (sin datos tuyos) para sumar productos."
```

## Prompt 7 — Categoría con filtros

```
[CONTEXTO]

SCREEN: Category listing "Lácteos". Bottom nav "Inicio" active.

Layout:
- Top app bar: back arrow, title "Lácteos", search icon.
- Subcategory chips (horizontal scroll): "Todos" (selected), "Leches", "Yogures", "Quesos", "Manteca y crema", "Postres".
- Toolbar: "342 productos" left, right "Ordenar" and "Filtrar" buttons with icons (Filtrar shows badge "2").
- 2-column product grid: each card with square image on white, name (2 lines), "desde $ 1.150", unit price caption "$ 1.150 / L", supermarket tag of the cheapest ("● ChangoMás"), and a small "+" button. One card with promo chip "3x2".

Second frame — "Filtrar y ordenar" bottom sheet open:
- "Ordenar por": radio options "Precio más bajo", "Precio por kg/L más bajo", "Nombre A–Z".
- "Marca": checkbox list with counts (La Serenísima 48, Sancor 41, Ilolay 22, Tregar 19, "Ver todas").
- "Supermercado": the 6 supermarket tags as toggle chips.
- Toggle "Solo con promo".
- Footer: "Limpiar" text button + primary "Ver 87 productos".
```

## Prompt 8 — Ficha de producto (envasado)

```
[CONTEXTO]

SCREEN: Product detail for a packaged product. The most important screen of the app.

Layout:
- Top app bar: back arrow, share icon, heart/add icon.
- Product header: image 160px on white card centered, name H1 "Aceite de girasol Natura 1,5 L", caption "Natura · EAN 7790060023172".
- Summary card highlighted with green tint: "Más barato en ● ChangoMás" big "$ 3.249" and chip "Ahorrás hasta $ 1.110 vs. Jumbo".
- Section "Precios en tu zona" — table/list of 6 price rows (core price row component), sorted cheapest first:
  1. ● ChangoMás $ 3.249 · $ 2.166 / L · "Actualizado hace 2 h" · green "Más barato"
  2. ● Comodín $ 3.390 · $ 2.260 / L · promo chip "2da al 70%"
  3. ● Carrefour $ 3.499 · $ 2.333 / L · strikethrough list price "$ 3.890" and chip "-10%"
  4. ● Vea (Yerba Buena) $ 3.650 · $ 2.433 / L · "Actualizado hace 1 día"
  5. ● La Anónima (Zona Norte) $ 3.799 · warning chip "Precio de hace 4 días"
  6. ● Jumbo — "Sin dato" dashed variant
- Promo suggestion card (amber tint, lightbulb icon): "En Comodín, si llevás 2 pagás $ 4.407 ($ 2.204 c/u). Ahorrás $ 2.373."
- Section "Historial de 60 días": simple line chart, one line per supermarket in their identity colors, x-axis dates (30/08 … 29/10), y-axis in $; legend with toggleable supermarket chips; caption "Precio más bajo en 60 días: $ 3.099 (ChangoMás, 12/10)".
- Card "Alternativa más barata": "En ChangoMás, Aceite de girasol Cocinero 1,5 L cuesta $ 2.890 ($ 1.927 / L)" with "Ver" link.
- Legal footnote caption.
- Sticky bottom bar: quantity stepper "− 1 +" on the left and primary button "Agregar a lista" on the right.
```

## Prompt 9 — Agregar a lista (bottom sheet)

```
[CONTEXTO]

SCREEN: Product detail with an "Agregar a lista" bottom sheet open over a dimmed background.

Bottom sheet content:
- Grabber, title "Agregar a lista", product mini row (thumb + "Aceite de girasol Natura 1,5 L").
- Quantity: label "Cantidad" with large stepper "− 2 +", and helper chip in amber "Llevando 2 en Comodín: 2da al 70%".
- "Elegí la lista": radio list of lists: "Compra del mes (24)" selected, "Asado del domingo (9)", "+ Crear lista nueva" (opens inline text field "Nombre de la lista").
- Primary full-width button "Agregar a Compra del mes".
Also show a second frame: confirmation snackbar at the bottom "Agregado a Compra del mes" with "Ver lista" action.
```

## Prompt 10 — Ficha de fresco (por kg)

```
[CONTEXTO]

SCREEN: Fresh generic product detail, compared by kilo. Example "Nalga" (beef cut).

Layout:
- Top app bar: back arrow, share icon.
- Header: generic illustration/icon placeholder (no brand image), title H1 "Nalga", chips "Fresco" and "Por kg", caption "Comparamos el precio por kilo entre supers."
- Summary green card: "Más barata en ● Vea" big "$ 11.990 / kg", chip "Ahorrás $ 2.100 por kg vs. Carrefour".
- Price rows per supermarket, all per kg:
  ● Vea $ 11.990 / kg · "Nalga feteada x kg"
  ● ChangoMás $ 12.490 / kg · "Nalga en bandeja 0,8 kg — $ 9.992 la bandeja" (show equivalence in caption)
  ● Comodín $ 12.800 / kg
  ● Carrefour $ 14.090 / kg
  ● Jumbo — "Sin dato"
  ● La Anónima — "Sin dato"
- Info row with info icon: "Cada super lo nombra distinto. Revisamos a mano qué producto equivale a 'Nalga'."
- Historial de 60 días chart (same style as packaged products).
- Sticky bottom bar: kg stepper "− 1,5 kg +" (0,25 kg steps) and primary button "Agregar a lista".
```

## Prompt 11 — Mis listas

```
[CONTEXTO]

SCREEN: "Mis listas". Bottom nav "Listas" active.

Layout:
- Header H1 "Mis listas", subtitle caption "Se guardan en este teléfono."
- List cards (full width), each with: name, "24 productos · editada hoy", best option line "Conviene ● ChangoMás · $ 186.430", savings chip "Ahorrás $ 8.420", and a "⋮" overflow menu.
  Cards: "Compra del mes", "Asado del domingo" (9 productos), "Limpieza" (6 productos, no comparison yet: caption "Tocá para comparar").
- Show the overflow menu open on the first card as a popover: "Renombrar", "Duplicar", "Compartir por WhatsApp", "Borrar" (red).
- Floating primary button bottom-right above nav: "+ Nueva lista".

Second frame — empty state: cart illustration, "Todavía no tenés listas", "Armá tu primera lista y te decimos dónde conviene comprarla.", primary "Crear lista".
```

## Prompt 12 — Detalle de lista

```
[CONTEXTO]

SCREEN: List detail "Compra del mes". Bottom nav "Listas" active.

Layout:
- Top app bar: back arrow, editable title "Compra del mes", icons: share (WhatsApp), "⋮".
- Summary strip: "24 productos" and "Mejor opción: ● ChangoMás $ 186.430" (tappable).
- Inline "Agregar producto" search field at top of the list.
- Items grouped by category headers (Almacén, Lácteos, Carnes, Verdulería...). Each item row: thumbnail, name, best price caption "desde $ 3.249 en ChangoMás", right side stepper "− 2 +". Fresh items use kg stepper "− 1,5 kg +" and a "Por kg" chip.
- Two rows show an inline warning in amber: "Hay una opción más barata en Vea: Arroz Gallo Oro 1 kg $ 1.890" with "Ver" link.
- One row shows "Sin dato en 2 supers" in gray.
- Swipe-to-delete hint on one row (red delete area revealed).
- Sticky bottom CTA bar above the nav: left "24 productos", right primary button "Comparar supers".
```

## Prompt 13 — Comparación: un super

```
[CONTEXTO]

SCREEN: List comparison, tab "Un super". Title "Compra del mes".

Layout:
- Top app bar: back arrow, title "¿Dónde conviene?", share icon.
- Segmented tabs: "Un super" (active) / "Repartido en 2".
- Hero winner card (green tint, large): "Te conviene ● ChangoMás", Display-size total "$ 186.430", coverage chip "Tiene 23 de 24", caption "Promos por cantidad ya aplicadas".
- Ranking list (ordered by coverage first, then total). Each row: position number, supermarket tag, coverage bar + "23 de 24", total, and a savings line versus the winner. Rows:
  1. ChangoMás — 23/24 — $ 186.430 — "Mejor opción"
  2. Comodín — 23/24 — $ 191.120 — "Pagás $ 4.690 más"
  3. Carrefour — 22/24 — $ 194.850
  4. Vea (Yerba Buena) — 21/24 — $ 196.200
  5. Jumbo — 20/24 — $ 214.300
  6. La Anónima — 18/24 — $ 189.900 + warning chip "Precios de hace 3 días"
- Expanded detail of the winner row: "Contra Vea ahorrás $ 9.770 (en 21 productos que tienen los dos)", "Contra Jumbo ahorrás $ 27.870 (en 20 productos)", "Contra Carrefour ahorrás $ 8.420 (en 22 productos)".
- Small explainer row with info icon: "El ahorro se calcula solo con los productos que tienen los dos supers."
- Section "Faltan en ChangoMás": 1 item in gray "Sin dato: Queso cremoso Punta del Agua x kg".
- Card "Ver detalle por producto" (chevron).
- Sticky bottom primary button "Ir a comprar a ChangoMás" (starts shopping mode).
```

## Prompt 14 — Comparación: repartido en 2

```
[CONTEXTO]

SCREEN: List comparison, tab "Repartido en 2" active.

Layout:
- Same app bar and segmented tabs, "Repartido en 2" active.
- Hero card: "Mejor combinación" with two supermarket tags "● ChangoMás + ● Vea", Display total "$ 179.860", coverage chip "24 de 24", green savings chip "Ahorrás $ 6.570 más que yendo solo a ChangoMás".
- Two collapsible split sections, each with supermarket color stripe on the left:
  - "En ● ChangoMás · 15 productos · $ 112.300" with item rows (name, qty, price).
  - "En ● Vea · 9 productos · $ 67.560" with item rows.
- Below: "Otras combinaciones" compact list: "ChangoMás + Comodín — $ 181.200 — ahorrás $ 5.230", "Carrefour + Vea — $ 183.900".
- Second frame variant: neutral gray banner "No vale la pena dividir: ahorrás solo $ 640 (0,3%). Te conviene ir a un solo super." 
- Sticky bottom: secondary "Compartir" + primary "Ir a comprar".
```

## Prompt 15 — Detalle por producto y sugerencias de promo

```
[CONTEXTO]

SCREEN: Per-item comparison matrix for the list "Compra del mes".

Layout:
- App bar: back arrow, title "Detalle por producto".
- Horizontally scrollable table: first column frozen with product name + quantity ("Aceite Natura 1,5 L × 2"); then one column per supermarket (header = colored dot + short name). Cells show item cost for that quantity; cheapest cell per row highlighted green with check; cells with promo show small amber chip "2da 70%"; missing cells show dashed "Sin dato"; stale cells show tiny orange clock icon.
- Footer row "Total" bold per supermarket and "Cobertura 23/24".
- Section "Sugerencias de promo" (amber cards, lightbulb icon), each with a "Solo te avisamos, no cambiamos tu lista" tone:
  - "Yogur Ser 190 g en Carrefour: si llevás 3 en vez de 2 pagás $ 2.380 ($ 793 c/u). Ahorrás $ 397 por unidad."
  - "Detergente Magistral 750 ml en Comodín: 3x2. Si llevás 3 pagás $ 4.200 ($ 1.400 c/u)."
  Each card has a text button "Cambiar cantidad".
```

## Prompt 16 — Modo compra: elegir super

```
[CONTEXTO]

SCREEN: Shopping mode — choose the store. Full screen, no bottom nav.

Layout:
- App bar with close (x), title "Modo compra".
- H1 "¿En qué super estás?"
- Large selectable cards for each supermarket (one per chain with the chosen branch): colored stripe, name, branch caption, "23 de 24 productos", "$ 186.430". First one marked "Recomendado" chip in green.
- Also an option "Usar la combinación ChangoMás + Vea" as a card.
- Sticky bottom primary button "Empezar".
```

## Prompt 17 — Modo compra: lista por sector

```
[CONTEXTO]

SCREEN: Shopping mode active inside the store "● ChangoMás". Optimized for one-hand use while walking, extra-large text and checkboxes, high contrast. No bottom nav.

Layout:
- Compact top bar: close (x), title "ChangoMás", progress "9 de 23" with a thin green progress bar, and a screen-awake icon toggle.
- List grouped by store sector in walking order with sticky section headers: "Verdulería", "Panadería", "Almacén", "Lácteos", "Carnes", "Limpieza", "Perfumería".
- Each item row: large 32px round checkbox, name in 18px semibold, quantity "× 2" or "1,5 kg", price on the right. Checked items: checkbox filled green, name struck through and muted, row moves to the end of its section.
- One row has amber promo chip "2da al 70% — ya aplicado".
- Section "No está en ChangoMás" at the end in gray with 1 item.
- Sticky bottom bar (big): left "En el changuito: $ 71.240", right "Total estimado: $ 186.430". Secondary text button "Terminar".

Second frame — finished: success state "¡Listo!" with cart illustration, "Gastaste aprox. $ 186.430", "Comparado con Jumbo ahorraste $ 27.870", buttons "Volver a mis listas" and secondary "Desmarcar todo".
```

## Prompt 18 — Ajustes

```
[CONTEXTO]

SCREEN: "Ajustes". Bottom nav "Ajustes" active.

Layout as grouped settings list (iOS/Material hybrid, rounded group cards):
- Group "Mis sucursales": rows "● Vea — Yerba Buena (Av. Aconquija)" chevron, "● La Anónima — Zona Norte" chevron, "● Jumbo — Yerba Buena" (no chevron, caption "Única"), row "Cambiar mi zona — Yerba Buena".
- Group "Preferencias": "Tema" with segmented "Claro / Oscuro / Automático"; "Ahorro mínimo para dividir en 2 supers" value "$ 1.000 o 3%".
- Group "Supermercados": row "Supers incluidos" (6) and row "Próximamente" with caption "Gómez Pardo, Aledo, El Marqués, Capo".
- Group "Información": "Estado de los precios", "Fuentes y licencias", "Aviso legal", "Acerca de Changuito".
- Group "Datos": "Instalar la app en tu teléfono", "Borrar datos de este teléfono" (red text).
- Footer caption: "Changuito v1.0 · Gratis, sin publicidad y sin cuentas."
```

## Prompt 19 — Estado de los precios

```
[CONTEXTO]

SCREEN: "Estado de los precios" (data freshness per supermarket). Reached from the home status pill or Ajustes.

Layout:
- App bar back arrow, title "Estado de los precios".
- Intro caption: "Actualizamos los precios todos los días. Si una fuente se atrasa, te avisamos."
- One card per supermarket: tag, source label ("Web oficial" or "Datos públicos SEPA"), "Última actualización: hoy 09:14", frequency caption "2 veces por día" or "1 vez por día", status chip: green "Al día" / orange "Precios de hace 3 días" (for La Anónima) / red "Sin actualizar".
- Info card: "Los precios con más de 72 horas no se usan para comparar listas."
- Section "Próximamente": muted tags Gómez Pardo, Aledo, El Marqués, Capo with caption "No publican sus precios en internet."
```

## Prompt 20 — Fuentes, aviso legal y acerca de

```
[CONTEXTO]

SCREEN: "Fuentes y aviso legal". Long-form readable text page.

Layout:
- App bar back arrow, title "Fuentes y aviso legal".
- Section "De dónde salen los precios": Carrefour, ChangoMás y Comodín desde sus webs oficiales (precio para Tucumán). Vea, Jumbo y La Anónima desde el Sistema Electrónico de Publicidad de Precios Argentinos (SEPA), Secretaría de Comercio, licencia CC-BY 4.0, with an external link row.
- Highlighted legal callout card: "Precios tomados de las webs oficiales y de datos públicos (SEPA) el 29/10/2026. Pueden diferir en el local. Changuito no tiene relación con ningún supermercado. Los nombres se usan solo para identificar dónde está cada precio."
- Section "Qué no incluimos todavía": descuentos con tarjetas y billeteras, precios mayoristas.
- Section "Privacidad": "No hay cuentas ni cookies. Tus listas viven en tu teléfono. Registramos búsquedas de forma anónima para mejorar el catálogo."
- Section "Acerca de": short paragraph, "Hecho en Tucumán".
Comfortable reading: body 17px, max line length, headings H2.
```

## Prompt 21 — Lista compartida (vista previa)

```
[CONTEXTO]

SCREEN: Shared list preview — opened from a WhatsApp link by someone who may not have the app yet. No bottom nav.

Layout:
- Top: "changuito" wordmark, caption "Te compartieron una lista".
- Card: list name "Asado del domingo", "9 productos", "Mejor opción hoy: ● Vea · $ 98.450".
- Read-only item list: name + quantity ("Vacío × 2 kg", "Chorizo parrillero × 1 kg", "Carbón 4 kg × 1", "Coca-Cola 2,25 L × 3", "Pan francés × 1 kg"...).
- Sticky bottom: primary button "Guardar en mis listas", secondary text button "Solo comparar".

Second frame — the WhatsApp share preview as it would appear in a chat bubble: message text "Te paso mi lista 'Asado del domingo' en Changuito 🛒" with link "changuito-tuc.vercel.app/l#…".
```

## Prompt 22 — Estados sin conexión y precios viejos

```
[CONTEXTO]

SCREEN: Three frames showing system states on the list detail "Compra del mes".

Frame 1 — Offline: top persistent banner (gray-blue, cloud-off icon) "Sin conexión. Mostrando precios guardados el 28/10 a las 18:00." Everything else usable; "Comparar supers" still enabled.

Frame 2 — Stale source: orange warning banner in the comparison screen "La Anónima no actualiza hace 3 días. No la usamos en la comparación." with "Ver estado" link; La Anónima row grayed out with "Precios viejos".

Frame 3 — Loading skeletons for the product detail screen: shimmer placeholders for image, title and 6 price rows.

Also include a small toast example "Precios actualizados" with green check.
```

---

## Admin (crear en modo **Web**, responsive; ancho 1280 y que también funcione en celular)

Bloque CONTEXTO para Admin (reemplaza al anterior en estas pantallas):

```
CONTEXT — Admin panel of Changuito (supermarket price comparator for Tucumán, Argentina). Only one admin user (the owner). Same Changuito design system (Verde Changuito #1F7A4D, Plus Jakarta Sans + Inter, radius 12–16, 1px borders, supermarket colored dots, no logos). Desktop web app 1280px with a left sidebar, but responsive. Utility-first, dense but calm, data tables with tabular numerals. UI copy in Argentine Spanish ("vos").
```

## Prompt 23 — Admin: ingreso con magic link

```
[CONTEXTO ADMIN]

SCREEN: Admin login at /admin. Centered card on off-white background.
- "changuito" wordmark + caption "Panel de administración".
- Email field "Tu email", primary button "Enviarme el link de acceso".
- Second state in the same card: envelope icon, "Te mandamos un link a ad***@gmail.com. Abrilo desde este dispositivo.", text button "Reenviar".
- Third state: error "Este email no tiene acceso al panel."
```

## Prompt 24 — Admin: estado de fuentes y base

```
[CONTEXTO ADMIN]

SCREEN: Admin dashboard "Estado". Left sidebar nav: "Estado" (active), "Frescos pendientes" (badge 37), "Búsquedas sin resultado", "Salir".

Main content:
- KPI row of 4 cards: "Productos en catálogo 48.212", "Precios actuales 196.540", "Frescos aprobados 152 / 200", "Tamaño de la base 286 MB / 500 MB" with a progress bar (green; turns orange at 400 MB — show threshold marker "Alerta 400 MB").
- Table "Fuentes": columns Super, Fuente (VTEX / SEPA), Última corrida, Duración, Ítems leídos, Ítems escritos, Verificación de región (check / x), Estado (chip Ok / Falló / Atrasada), Próxima corrida. 6 rows; Carrefour Ok; ChangoMás Ok; Comodín Ok; Vea Ok; Jumbo Ok; La Anónima "Atrasada 3 días" orange with "Usando respaldo web" caption.
- Below: "Últimas corridas" compact log list with timestamp, workflow name (ingest-vtex, ingest-sepa, maintenance), status, and expandable error text for one failed run ("Simulación de carrito: precio no coincide para EAN 7790070…").
```

## Prompt 25 — Admin: equivalencias de frescos

```
[CONTEXTO ADMIN]

SCREEN: "Frescos pendientes" — approve fresh product equivalences. Sidebar same as before with this item active.

Layout:
- Header "Frescos pendientes" + count "37 sugerencias", filters: search "Buscar genérico", select "Super: Todos", select "Categoría: Todas", tabs "Pendientes / Aprobadas / Rechazadas".
- Grouped by generic product. Group header: "Tomate redondo · por kg · Verdulería · aprobado en 4 de 6 supers".
- Each suggestion row: supermarket tag, raw product name from that store ("Tomate perita bandeja 0,4 kg"), its price "$ 1.290", editable numeric input "Factor a kg: 0,4", computed "= $ 3.225 / kg", match score bar "87%", and actions: green "Aprobar", gray "Rechazar". One row flagged with orange "Precio por kg fuera de rango".
- Bulk action bar at bottom when rows are selected: "3 seleccionadas — Aprobar todas / Rechazar".
```

## Prompt 26 — Admin: búsquedas sin resultado

```
[CONTEXTO ADMIN]

SCREEN: "Búsquedas sin resultado". Same sidebar, this item active.

Layout:
- Header + period selector "Últimos 7 días / 30 días".
- Table: Término buscado (normalized, e.g. "fernet branca 2 l", "nalga feteada", "pañales pampers xg"), Veces, Última vez, Acción (buttons "Crear sinónimo", "Asignar a fresco", "Ignorar").
- Side card: "Lo más buscado (con resultados)" top 10 list with counts.
- Caption: "Las búsquedas se guardan sin IP ni datos personales."
```

---

## Checklist para revisar en Stitch antes de exportar

- Los 6 supers siempre como **texto + punto de color**, nunca logos.
- Precios con formato `$ 1.299,90` y precio por kg/L visible en todas partes.
- Verde reservado para ahorro y acciones principales; ámbar para promos; naranja para precios viejos; gris punteado para "Sin dato".
- CTA principal abajo, al alcance del pulgar.
- Texto en "vos" en toda la interfaz.
- Pedile a Stitch la versión en **modo oscuro** de al menos: Inicio, Producto, Lista, Comparación y Modo compra ("Create the dark mode version of this screen using the dark tokens of the design system").
