# MicroShop ERP — Design System

## 1. Visual Theme & Atmosphere

MicroShop is a dark-mode-first ERP for Peruvian businesses — a professional workspace where dense financial data, inventory tables, and point-of-sale interfaces must remain readable across long work sessions. The default admin canvas (`oklch(0.10 0 0)` / `#0f0f0f`) provides maximum contrast for data-heavy screens without eye strain. Color is used semantically, not decoratively: brand red (`#d7132a`) marks primary actions, status colors communicate state, and the neutral gray scale handles everything else.

The system uses OKLCH color space for perceptually uniform color transitions across 30+ themes. Three distinct contexts exist — **admin** (dark ERP), **shop** (light storefront), and **POS** (dark point-of-sale) — each with independent theme selection persisted in localStorage.

**Key Characteristics:**
- Dark-mode-native ERP: `#0f0f0f` background, `#171717` surfaces, `#202020` elevated panels
- OKLCH color tokens throughout — perceptually uniform, theme-adaptive
- Brand red `#d7132a` for primary actions — never blue in admin/ERP context
- 30+ themes across 4 categories: default, professional, seasonal, shop
- Tailwind v4 engine with semantic CSS custom properties
- Three font families: Inter (body), Baloo 2 (display), JetBrains Mono (code)
- Glassmorphism effects for premium surfaces (backdrop-blur + semi-transparent bg)
- Peruvian payment integrations: YAPE (`#742284`), PLIN (`#00D4FF`)
- WCAG AAA support via graphite-contrast theme (14:1 ratio)

## 2. Color Palette & Roles

### Background Surfaces (Default Dark)
- **Page Background** (`oklch(0.10 0 0)` / `#0f0f0f`): Deepest canvas — main content area behind everything.
- **Surface** (`oklch(0.17 0 0)` / `#171717`): Cards, sidebar, panels. One step above page.
- **Surface Raised** (`oklch(0.21 0 0)` / `#202020`): Elevated elements — hover states, dropdowns, popovers.
- **Border** (`oklch(0.27 0 0)` / `#2c2c2c`): Default border color for separations.

### Text & Content (Dark)
- **Primary** (`oklch(0.96 0 0)` / `#f5f5f5`): Default text — near-white, not pure white.
- **Secondary** (`oklch(0.71 0 0)`): Body text, descriptions, secondary content.
- **Muted** (`oklch(0.55 0 0)`): Placeholders, metadata, de-emphasized labels.
- **On Primary** (`oklch(1 0 0)` / white): Text on primary-colored backgrounds (buttons, badges).
- **On Secondary** (`oklch(1 0 0)` / white): Text on dark header/sidebar backgrounds.

### Brand & Accent
- **Primary Red** (`oklch(0.55 0.22 25)` / `#d7132a`): CTAs, primary buttons, active states, brand marks.
- **Primary Dark** (`oklch(0.45 0.22 25)` / `#b50f23`): Hover/pressed states on primary elements.
- **Accent Orange** (`#FB8C00`): Secondary accent — highlights, badges, secondary actions.
- **Accent Orange Dark** (`#F57C00`): Hover state for accent elements.

### Status / Semantic Colors
- **Success** (`oklch(0.72 0.22 150)`): Completed, active, paid, approved states.
- **Warning** (`oklch(0.80 0.18 86)`): Pending, attention needed, partial states.
- **Error** (`oklch(0.64 0.24 25)`): Failed, rejected, validation errors.
- **Info** (`oklch(0.65 0.20 250)`): Informational, neutral notifications.
- **Danger** (`oklch(0.59 0.24 25)`): Destructive actions — delete, cancel, void.

### Peruvian Payment Colors
- **YAPE** (`#742284`): Purple — Peruvian mobile payment.
- **PLIN** (`#00D4FF` bg, `#002f5c` text): Cyan — Peruvian mobile payment.
- **Visa** (`#1a1f71`): Card payment brand.

### Gray Scale (Neutral Ramp)
```
gray-50:   oklch(0.99 0 0)    gray-500:  oklch(0.55 0 0)
gray-100:  oklch(0.97 0 0)    gray-600:  oklch(0.45 0 0)
gray-200:  oklch(0.93 0 0)    gray-700:  oklch(0.37 0 0)
gray-300:  oklch(0.87 0 0)    gray-800:  oklch(0.28 0 0)
gray-400:  oklch(0.71 0 0)    gray-900:  oklch(0.20 0 0)
                                gray-950:  oklch(0.15 0 0)
```

### Overlay & Interaction (Dark)
- **Hover Overlay**: `oklch(1 0 0 / 0.05)` — white at 5% opacity on dark surfaces.
- **Active Overlay**: `oklch(1 0 0 / 0.10)` — white at 10% for pressed states.
- **Modal Backdrop**: `rgba(0,0,0,0.6)` — semi-transparent black overlay.
- **Focus Ring**: `color-mix(in srgb, var(--color-primary) 30%, transparent)` — theme-adaptive focus.

### Light Mode Override
- **Page Background**: `#E3E6E6`
- **Surface**: white
- **Text Primary**: `oklch(0.20 0 0)` (near-black)
- **Border**: `oklch(0.87 0 0)`
- **Hover Overlay**: `oklch(0 0 0 / 0.05)` — black at 5% on light surfaces
- **Shadows**: Reduced opacity (5–10% instead of 40–70%)

## 3. Typography Rules

### Font Families
- **Sans (Body)**: `"Inter", "Outfit", "Segoe UI", system-ui, sans-serif`
- **Display (Headings)**: `"Baloo 2", "Outfit", "Segoe UI", sans-serif` — weight 700–800
- **Monospace (Code)**: `"JetBrains Mono", "Fira Code", monospace`

### Type Scale

| Token | Size | Use |
|-------|------|-----|
| `text-xs` | 0.75rem (12px) | Micro labels, timestamps, overlines |
| `text-sm` | 0.875rem (14px) | Table cells, captions, metadata |
| `text-base` | 1rem (16px) | Body text, form inputs, navigation |
| `text-lg` | 1.125rem (18px) | Sub-headings, card titles |
| `text-xl` | 1.25rem (20px) | Section titles |
| `text-2xl` | 1.5rem (24px) | Page titles |
| `text-3xl` | 1.875rem (30px) | Dashboard metrics, hero numbers |
| `text-4xl` | 2.25rem (36px) | Large display numbers |
| `text-5xl` | 3rem (48px) | Hero headlines, KPI spotlights |

### Weights

| Token | Value | Use |
|-------|-------|-----|
| `font-normal` | 400 | Body text, descriptions, reading content |
| `font-medium` | 500 | Labels, navigation, form labels, table headers |
| `font-semibold` | 600 | Card titles, section headings, emphasis |
| `font-bold` | 700 | Buttons, page titles, important headings |
| `font-extrabold` | 800 | Display headings (Baloo 2), hero text |

### Line Heights
- **Tight** (1.25): Headings, display text, compact labels
- **Normal** (1.5): Body text, form content, standard reading
- **Relaxed** (1.75): Long-form descriptions, help text

### Principles
- **Inter for data**: 400 for reading, 500 for labels, 600 for emphasis. ERP tables use 14px/400 for density.
- **Baloo 2 for impact**: Display headings only — dashboard heroes, landing page titles. Never in forms or tables.
- **JetBrains Mono for precision**: RUC numbers, amounts (S/.), invoice codes, code blocks.
- **No blue in admin**: Brand red `#d7132a` is primary CTA, never `#3b82f6` or similar blues in ERP context.

## 4. Component Stylings

### Buttons

**Primary (`.btn-primary`)**
- Background: `var(--color-primary)` (red `#d7132a`)
- Text: white
- Font: 14px, bold
- Radius: `var(--radius-md)` (8px)
- Hover: `filter: brightness(1.10)`
- Use: Save, Create, Submit, Confirm

**Secondary (`.btn-secondary`)**
- Background: transparent
- Border: `1px solid var(--color-border)`
- Text: `var(--color-text-primary)`
- Hover: `var(--color-hover-overlay)` background
- Use: Cancel, Back, secondary actions

**Ghost (`.btn-ghost`)**
- Background: transparent, no border
- Hover: `var(--color-hover-overlay)`
- Use: Toolbar actions, inline toggles

**Danger (`.btn-danger`)**
- Background: `var(--color-danger)`
- Text: white
- Use: Delete, Void, destructive actions

**Icon Button (`.icon-btn`)**
- Size: 40x40px (default), 32x32px (`.icon-btn-sm`)
- Radius: 50% (circular)
- Use: Close, menu, actions in tight spaces

### Cards

**ERP Card (`.card-erp`)**
- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Radius: `var(--radius-lg)` (12px)
- Shadow: `var(--shadow-md)`
- Padding: `var(--spacing-xl)` (32px)
- Layout: flex column

**Product Card (`.card-product`)**
- Glossy gradient overlay effect
- Hover: `var(--shadow-xl)` + `translateY(-4px)` lift
- Use: Shop storefront product display

### Data Tables (`.data-table`)
- Width: 100%, border-collapse
- Font: 14px
- **Header** (`th`): surface-raised bg, 12px 16px padding, font-600, uppercase tracking, text-xs
- **Rows** (`td`): 12px 16px padding, border-bottom
- **Row Hover**: surface-raised background
- **Sortable**: cursor pointer, hover brighten 4%

### Forms

**Field Container (`.form-field`)**
- Layout: flex column, gap 6px, margin-bottom 16px

**Label (`.form-label`)**
- Font: 14px, weight 500, secondary text color

**Input (`.form-input`)**
- Width: 100%
- Padding: 10px 12px
- Radius: `var(--radius-md)` (8px)
- Border: `1px solid var(--color-border)`
- Focus: `border-color: var(--color-primary)` + focus ring shadow
- Error: `border-color: var(--color-error)`
- Disabled: opacity 0.7, cursor not-allowed

### Badges (`.badge-erp`)
- Display: inline-flex
- Padding: `var(--spacing-xs)` horizontal, smaller vertical
- Radius: `var(--radius-full)` (pill)
- Font: text-xs, bold
- Variants:
  - `.badge-success`: success/10 bg + success text
  - `.badge-warning`: warning/10 bg + warning text
  - `.badge-danger`: danger/10 bg + danger text
  - `.badge-info`: info/10 bg + info text

### Modals (`.modal-backdrop` + `.modal-container`)
- Backdrop: fixed full-screen, `rgba(0,0,0,0.6)`, fadeIn animation
- Container: max-height 90vh, slideUp animation
- Sizes: `sm` (400px), `md` (600px), `lg` (800px), `xl` (1200px), `full` (95vw)
- Header: 20px 24px padding, border-bottom
- Body: 24px padding, overflow-y auto
- Footer: 16px 24px, flex gap-12, justify-end

### Glassmorphism
```
.glass-effect:       backdrop-blur-md, bg-white/5, border-white/10, shadow-lg
.glass-effect-dark:  backdrop-blur-md, bg-black/20, border-white/5, shadow-xl
.glossy-panel:       linear-gradient overlay + backdrop-blur-lg
```

### Spinners
- Sizes: `sm` (20px/2px border), `md` (40px/4px), `lg` (60px/6px)
- Colors: primary, secondary, success, danger (border with top accent)
- Animation: 1s linear infinite spin

## 5. Layout Principles

### Spacing Scale
```
--spacing-xs:    0.25rem   (4px)   — Tight gaps, badge padding
--spacing-sm:    0.5rem    (8px)   — Form gaps, small margins
--spacing-md:    1rem      (16px)  — Default gap, form field spacing
--spacing-lg:    1.5rem    (24px)  — Card gaps, section padding
--spacing-xl:    2rem      (32px)  — Section gaps, card internal padding
--spacing-2xl:   3rem      (48px)  — Major section separation
--spacing-3xl:   4rem      (64px)  — Page-level vertical rhythm
```

### Component Spacing
```
--card-gap:      1.5rem    (24px)  — Between cards in a grid
--form-gap:      1rem      (16px)  — Between form fields
--section-gap:   2rem      (32px)  — Between major page sections
```

### Grid & Container
- Max content width: `max-w-7xl` (~1280px)
- Admin layout: 260px fixed sidebar + fluid main content
- Mobile: sidebar hidden, full-width content
- Container: `mx-auto, px-lg` (responsive horizontal padding)

### Admin Layout Structure
```
.layout-main:          min-h-screen, bg-page, text-primary, flex-col
.navbar-erp:           full-width, surface bg, border-bottom, sticky top-0, z-50
.sidebar-erp:          260px width, surface bg, border-right, h-screen, overflow-y-auto
.layout-content-area:  flex-1, w-full, py-xl (main content)
.footer-erp:           full-width, surface bg, border-top, py-xl, mt-auto
```

### Border Radius Scale
```
--radius-sm:     0.25rem   (4px)   — Small badges, inline tags
--radius-md:     0.5rem    (8px)   — Buttons, inputs, default
--radius-lg:     0.75rem   (12px)  — Cards, modals, panels
--radius-xl:     1rem      (16px)  — Large containers, dialogs
--radius-full:   9999px            — Pills, avatars, status dots
```

## 6. Depth & Elevation

### Shadow System (Dark Theme)

| Level | Token | Treatment | Use |
|-------|-------|-----------|-----|
| 1 | `--shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.4)` | Subtle lift — toolbar buttons, small cards |
| 2 | `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.4)` | Cards, dropdowns, panels |
| 3 | `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.6), 0 4px 6px -4px rgb(0 0 0 / 0.5)` | Modals, popovers, elevated panels |
| 4 | `--shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.7), 0 8px 10px -6px rgb(0 0 0 / 0.6)` | Hero cards, featured elements |
| Glow | `--shadow-glow` | `color-mix(in srgb, primary 35-45%, transparent)` | Theme-tinted glow — active states, focus |

### Shadow System (Light Theme)
Same tokens, reduced opacity: `0.05`, `0.10`, `0.10`, `0.10` (vs dark's `0.40–0.70`).

### Elevation Philosophy
Surface stacking via background luminance: `#0f0f0f` (page) → `#171717` (surface) → `#202020` (raised). Shadows reinforce but don't define — the bg step IS the elevation.

## 7. Do's and Don'ts

### Do
- Use CSS custom properties (`var(--color-*)`) — never hardcode hex values in components
- Use `oklch()` for any new color definitions — perceptually uniform
- Use semantic Tailwind utilities: `bg-surface`, `text-on`, `border-token`
- Apply `OnPush` change detection + signals on all components
- Use `@if` / `@for` / `@switch` (Angular 17+ control flow), never `*ngIf`
- Keep data tables at 14px with 12px 16px cell padding for density
- Use `var(--color-primary)` for main CTAs — it adapts to all 30+ themes
- Use status badge variants (`.badge-success`, `.badge-warning`, etc.) for all state indicators
- Apply glassmorphism sparingly — dashboard cards, premium surfaces only
- Test new components against both dark (default) and arctic-light themes

### Don't
- Never use `#3b82f6` (blue) as primary color in admin/ERP — brand red only
- Never use `CommonModule` in standalone components — causes NG8113
- Never hardcode `#d7132a` — use `var(--color-primary)` so themes work
- Never use `environment.apiUrl` (empty string) — use `environment.apiUrls.{sales|purchases|users}`
- Never put heavy shadows on dark surfaces without matching bg luminance step
- Never use `font-weight: 700` (bold) for body text — reserve for buttons and titles
- Never use solid white (`#ffffff`) as page background in dark theme — use `var(--color-page)`
- Never import fonts outside `_tailwind.scss` — single source for Google Fonts
- Never create new SCSS files without adding `@use` in `styles.scss` — invisible in runtime otherwise

## 8. Responsive Behavior

### Breakpoints (Tailwind v4)
| Name | Width | Key Changes |
|------|-------|-------------|
| Default | <640px | Single column, sidebar hidden, compact padding |
| `sm` | 640px | Two-column grids begin |
| `md` | 768px | Sidebar visible (260px), admin layout activates |
| `lg` | 1024px | Full card grids, expanded padding |
| `xl` | 1280px | Max content width reached, generous margins |
| `2xl` | 1536px | Extra breathing room |

### Admin Responsive
- **Mobile** (<768px): Sidebar hidden, hamburger menu, full-width content
- **Desktop** (>=768px): 260px sidebar + fluid content with margin-left
- **Navbar**: Always sticky top-0, z-50, full-width

### Touch Targets
- Buttons: minimum 40px height via `.icon-btn`, comfortable padding on text buttons
- Table rows: 12px vertical padding minimum for tap targets
- Mobile nav: hamburger with adequate hit area

## 9. Animations & Transitions

### Timing Tokens
```
--transition-fast:   150ms   — Hover states, toggles, micro-interactions
--transition-base:   200ms   — Standard transitions, focus rings
--transition-slow:   300ms   — Modals, drawers, page transitions
```

### Easing Functions
```
--ease-out:      cubic-bezier(0, 0, 0.2, 1)     — Enters (modals, drawers)
--ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1)   — Symmetric (toggles, tabs)
```

### Named Animations
| Animation | Duration | Use |
|-----------|----------|-----|
| `fadeIn` | 0.2s ease-out | Modal backdrop, overlay enter |
| `slideUp` | 0.3s ease-out | Modal content, bottom sheets |
| `shimmer` | 2s linear infinite | Loading skeletons |
| `fade-in-up` | 0.5s ease-out | Content reveal on scroll |
| `slide-in-left` | 0.25s ease-out | Drawer/sidebar enter |
| `spin` | 1s linear infinite | Loading spinners |

## 10. Theme Architecture

### Three Contexts
| Context | Default Theme | localStorage Key | Typical Mode |
|---------|---------------|-------------------|--------------|
| `admin` | `dark` | `admin_theme` | Dark (ERP workspace) |
| `shop` | `fresh-mint` | `shop_theme` | Light (storefront) |
| `pos` | `dark` | `pos_theme` | Dark (point-of-sale) |

### Theme Application
- Theme `'dark'` → removes `data-theme` attribute (CSS defaults apply)
- Other themes → sets `data-theme="theme-name"` on `<html>`
- Server sync: `PUT /users/api/themes/active` with `{ module, themeKey, companyId }`

### Theme Categories (30 total)
| Category | Themes | Mode |
|----------|--------|------|
| Default | dark, obsidian, orange-black, orange-light | Mixed |
| Seasonal | verano, invierno, primavera, otoño, christmas, black-friday, summer | Mixed |
| Professional Dark | slate-professional, obsidian-dark, ember, forest, graphite-contrast, rose-executive | Dark |
| Professional Light | arctic-light, sakura-light, ocean-breeze, verdant-light, golden-sand, lavender-mist, charcoal-light | Light |
| Shop | fresh-mint, soft-blossom, golden-light, peach-cream, nordic-light, vibrant-play | Light |

### Key Theme Variants

**Obsidian** (Professional Dark)
- Background: `oklch(0.09 0.018 245)` — deep blue-carbon
- Primary: `#E8152D` (crimson) + Accent: `#E8A820` (amber)

**Arctic Light** (Corporate)
- Primary: `#0ea5e9` (sky blue) + Accent: `#14b8a6` (teal)
- WCAG AAA compliant for small text

**Graphite Contrast** (Accessibility)
- Primary: `#facc15` (yellow) on `#1a1a1a` (graphite)
- WCAG Ratio: 14:1 AAA — maximum readability

**Orange Themes** (override typography too)
- Font weights pushed to 900 for emphasis
- Border radius reduced (chiseled professional feel)
- Text sizes slightly increased for readability
- Spacing compacted for dense ERP screens

## 11. Agent Prompt Guide

### Quick Token Reference
```
Page background:    bg-page          / var(--color-page)
Surface:            bg-surface       / var(--color-surface)
Surface raised:     bg-surface-raised / var(--color-surface-raised)
Primary text:       text-on          / var(--color-text-primary)
Secondary text:     text-subtle      / var(--color-text-secondary)
Muted text:         text-muted       / var(--color-text-muted)
Primary action:     bg-primary       / var(--color-primary)
Accent:             bg-accent        / var(--color-accent)
Border:             border-token     / var(--color-border)
Text on buttons:    text-on-primary  / var(--color-primary-contrast)
```

### Example Component Prompts
- "Create an ERP dashboard card: `bg-surface`, `border border-token`, `rounded-lg`, `shadow-md`, `p-8`. Title at `text-lg font-semibold text-on`. Metric at `text-3xl font-bold text-on` with JetBrains Mono. Subtitle at `text-sm text-subtle`."
- "Build a data table: `.data-table` with sortable columns. Header `bg-surface-raised text-xs font-semibold uppercase tracking-wider`. Rows with `hover:bg-surface-raised` transition. Status column uses `.badge-success` / `.badge-warning` / `.badge-danger`."
- "Design a form: `.form-field` containers with `.form-label` + `.form-input`. Primary submit `.btn-primary`, cancel `.btn-secondary`. Error states with `border-error` and red text-xs message below input."
- "Create admin sidebar: 260px, `bg-surface`, `border-r border-token`, full height. Nav links at `text-sm font-medium text-subtle` with `hover:text-on hover:bg-surface-raised` and `rounded-md px-3 py-2`. Active link: `bg-primary/10 text-primary`."
- "Build modal: `.modal-backdrop` + `.modal-container` size `lg`. Header with title `text-lg font-semibold` + close `.icon-btn-sm`. Footer with `.btn-secondary` (Cancel) + `.btn-primary` (Save). SlideUp animation."

### Critical Rules for Code Generation
1. Always use CSS custom properties — never hardcode colors
2. Always use semantic Tailwind utilities (`bg-surface`, `text-on`) — they adapt across 30+ themes
3. `var(--color-primary)` = brand red in dark theme, sky blue in arctic-light, etc. — trust the token
4. Forms: `.form-field` > `.form-label` + `.form-input` — consistent structure everywhere
5. Tables: `.data-table` — 14px body, uppercase tracked headers, hover rows
6. Badges: `.badge-erp` + variant class — never build one-off status indicators
7. New SCSS partial → add `@use` in `styles.scss` or it won't load
8. Test against dark (admin default) + arctic-light (light professional) at minimum
