---
name: Changuito
colors:
  surface: '#f7faf5'
  surface-dim: '#d8dbd6'
  surface-bright: '#f7faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4ef'
  surface-container: '#ecefe9'
  surface-container-high: '#e6e9e4'
  surface-container-highest: '#e0e3de'
  on-surface: '#191d19'
  on-surface-variant: '#3f4941'
  inverse-surface: '#2d312e'
  inverse-on-surface: '#eff2ec'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#066c41'
  primary: '#006038'
  on-primary: '#ffffff'
  primary-container: '#1f7a4d'
  on-primary-container: '#aeffca'
  inverse-primary: '#82d8a3'
  secondary: '#006d30'
  on-secondary: '#ffffff'
  secondary-container: '#92f5a4'
  on-secondary-container: '#007233'
  tertiary: '#48564f'
  on-tertiary: '#ffffff'
  tertiary-container: '#606e67'
  on-tertiary-container: '#e1f0e7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef5be'
  primary-fixed-dim: '#82d8a3'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#00522f'
  secondary-fixed: '#95f8a7'
  secondary-fixed-dim: '#79db8d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#d7e6dd'
  tertiary-fixed-dim: '#bbcac1'
  on-tertiary-fixed: '#111e19'
  on-tertiary-fixed-variant: '#3c4a43'
  background: '#f7faf5'
  on-background: '#191d19'
  surface-variant: '#e0e3de'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  body-md-bold:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption-bold:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  price-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  price-md:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '700'
    lineHeight: 22px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system embodies a calm, accessible, and deeply trusted civic utility for everyday Argentine consumers across Gran San Miguel de Tucumán. Rather than projecting fintech aggression, retail urgency, or flash-sale clutter, the experience emphasizes clarity, relief, and neighborhood solidarity ("voz vecina").

The style balances **modern editorial utility** with **tactile warmth**:
- **Tone of Voice:** Argentine Spanish using authentic "voseo" (*"Fijate dónde te conviene comprar hoy"*, *"Ahorrás acá"*). The voice is neighborly, straightforward, respectful of household budgets, and completely free of retail gimmickry.
- **Visual Stance:** Crisp white cards resting on a warm, organic off-white substrate. Structural clarity over heavy ornamentation.
- **Spatial Rhythm:** Generous touch targets engineered for one-handed thumb reach during aisle navigation or daily shopping planning under variable mobile connectivity.

## Colors

The palette is strictly calibrated for high outdoor contrast and effortless scanning under bright sunlight:

### Surfaces & Backgrounds
- **Background Canvas:** `#FAFAF7` (warm off-white substrate that eliminates pure-white glare on mobile screens).
- **Surface / Cards:** `#FFFFFF` (pure white for discrete elevated card containers).
- **Subtle Surface:** `#F1F2EE` (neutral fills for search bars, inactive segments, and table headers).
- **Borders & Dividers:** `#E3E5DF` (low-contrast structural edges).

### Typography & Content
- **Text Primary:** `#161A17` (deep forest charcoal, high legibility for prices and titles).
- **Text Secondary:** `#5B625D` (balanced mid-tone for packaging details and supermarket tags).
- **Text Muted:** `#8A918C` (placeholders, timestamp markers, and secondary metadata).

### Brand & Value Signifiers
- **Primary ("Verde Changuito"):** `#1F7A4D` (approachable, established civic green).
- **Primary Pressed / Active:** `#17603C` (grounded feedback tone).
- **Primary Tint:** `#E3F2E9` (light atmospheric fill for selected filters and category badges).
- **Savings Affirmation:** `#15803D` text placed over `#DCFCE7` chip background to convey net consumer value.

### Supermarket Identity Indicators (10px solid dots)
Muted, distinct color accents used consistently across comparisons to identify retail chains without visual chaos:
- **Carrefour:** `#4E6A8C`
- **ChangoMás:** `#B07D2B`
- **Comodín:** `#85587F`
- **Vea:** `#B4604A`
- **Jumbo:** `#5A5E9A`
- **La Anónima:** `#7D6B5A`

## Typography

The typography structure combines the human geometry of **Plus Jakarta Sans** for headings with the systematic legibility of **Inter** for descriptions, nutritional tables, and data.

### Numeric & Currency Rules
- All numeric and pricing data rendered in Inter **must enforce tabular lining figures** (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`). This prevents layout jitter across vertical price lists and comparison columns.
- Currency symbols (`$`) align to the baseline and take a slightly lighter weight or secondary color token to maintain focus on the principal numerical amount.

## Layout & Spacing

The layout is built mobile-first, targeting an ideal baseline viewport width of 390px (scalable fluidly down to 360px and up to 430px) as a standalone Progressive Web App.

- **Grid Strategy:** Single-column content flow for mobile viewports, expanding to structured two-column comparison sheets on tablets (breakpoint `768px`) and capped max-width views (`480px` centered shell) when accessed on desktop browsers.
- **Edge Boundaries:** Fixed outer horizontal canvas padding of `16px` (`margin`) ensures maximal utility for horizontal real estate while insulating cards from bezel edges.
- **Physical Touch Target:** Interactive zones maintain an inviolable minimum boundary of `48px x 48px`, regardless of visual icon size.

## Elevation & Depth

Visual hierarchy relies on **clean structural layering and subtle border definition** rather than dense drop shadows, keeping rendering performance lightweight on mid-range Android devices.

- **Base Layer (Elevation 0):** Background surface (`#FAFAF7`).
- **Card Layer (Elevation 1):** Solid white surface (`#FFFFFF`) framed by a 1px border (`#E3E5DF`). A faint ambient grounding shadow is applied: `0 1px 3px rgba(22, 26, 23, 0.04)`.
- **Active / Dragged Layer (Elevation 2):** Used during basket reordering or interactive card swipes: `0 4px 12px rgba(22, 26, 23, 0.08)` paired with `#E3E5DF` border.
- **Floating Modals & Bottom Navigation Sheets (Elevation 3):** Grounded using `0 -4px 16px rgba(22, 26, 23, 0.06)` with a crisp top border (`#E3E5DF`).

## Shapes

The interface expresses a warm, welcoming geometry balanced with space efficiency:

- **Cards & Modal Sheets:** Defined at `16px` border-radius (`rounded-lg`), delivering an approachable, protective feel around price clusters.
- **Buttons, Text Inputs & Selection Controls:** Defined at `12px` border-radius, creating an ergonomic, natural touch surface.
- **Chips, Category Tags & Indicators:** Fully pill-shaped (`9999px`), distinguishing interactive metadata from container cards.

## Components

### Buttons
- **Primary:** Solid `#1F7A4D` background with white text, 12px corner radius, 48px height minimum. Active state transitions to `#17603C`.
- **Secondary / Outline:** `#FFFFFF` background with 1px `#E3E5DF` border and `#161A17` text.
- **Tertiary / Ghost:** No border or background; uses `#1F7A4D` medium text for secondary inline actions.

### Price Comparison Cards
- Surface `#FFFFFF` with 16px corner radius and 1px `#E3E5DF` stroke.
- Arranged with product image thumbnail (48x48px, rounded 8px), product title, package volume, and a sorted list of competing supermarkets.
- Lowest price entry is anchored with an "Ahorro" badge and high-contrast bold price token.

### Supermarket Indicator Dots
- Exactly `10px x 10px` solid circular nodes (`border-radius: 9999px`) aligned with supermarket title strings.
- Dot colors correspond directly to supermarket tokens (e.g., `#4E6A8C` for Carrefour, `#B4604A` for Vea).

### Savings Badges & Chips
- **Ahorro Chip:** Full pill (`9999px`), background `#DCFCE7`, text `#15803D` (Inter 13px Semibold).
- **Filter Chips:** Pill shape with 32px height; unselected uses `#F1F2EE` with `#5B625D` text; selected transitions to `#E3F2E9` with `#1F7A4D` text and a 1px border (`#1F7A4D`).

### Inputs & Search Bars
- Background `#F1F2EE` in rest state, transitioning to `#FFFFFF` with a 1.5px `#1F7A4D` border on focus.
- 48px height, 12px border radius, clear button (`X`) with minimum 48px hit area.

### Bottom Navigation Bar (Mobile PWA)
- Persistent 64px bar anchored to mobile viewport bottom, factoring in safe-area-inset-bottom.
- Surface `#FFFFFF`, top stroke 1px `#E3E5DF`, active icon and text in `#1F7A4D`, inactive in `#8A918C`.