# app-shop — CLAUDE.md

**Framework:** Angular 21 Standalone | **Package manager:** Bun | **Dev port:** 4200

## Estructura de features

```
src/app/features/
├── admin/          → Panel ERP: productos, categorías, empresas, clientes, compras, contabilidad, etc.
├── auth/           → Login, registro, recuperación de contraseña
├── cart/           → Carrito de compras
├── checkout/       → Flujo de pago
├── compras/        → UI módulo compras (proveedores, OC, cotizaciones, facturas…)
├── contabilidad/   → UI módulo contabilidad (asientos, PCGE, cierres…)
├── pos/            → Punto de Venta (con offline via Dexie.js)
├── rrhh/           → UI RRHH (empleados, vacaciones, evaluaciones)
├── tesoreria/      → UI tesorería
└── …               → home, orders, account, portal (autoservicio), inventory/logistica
```

## MFE (Module Federation) — ports 4200-4206

```
shell (4200)        → app-shop/src/
mfe-pos (4201)      → projects/mfe-pos/
mfe-rrhh (4202)     → projects/mfe-rrhh/
mfe-finanzas (4203) → projects/mfe-finanzas/
mfe-operaciones (4204) → projects/mfe-operaciones/
mfe-platform (4205) → projects/mfe-platform/
mfe-comercial (4206) → projects/mfe-comercial/
```

## Comandos

```bash
cd app-shop
npm start              # Shell + Tailwind watch (port 4200)
npm run start:all      # Shell + 6 MFEs (ports 4200-4206)
npm run build          # Production build
npm test               # Vitest

# Verificar TypeScript sin build completo:
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json

# NUNCA usar: npm install (falla con ENOENT en git bash)
# USAR: /c/Users/winst/.bun/bin/bun add <pkg>
```

## Convenciones Angular (críticas)

### Estado y componentes
- **OnPush + Signals** siempre: `signal()`, `computed()`, `effect()` — NO `BehaviorSubject`
- **Standalone components** — no NgModules; cada componente declara sus `imports[]`
- **NO incluir `CommonModule`** en standalone — genera NG8113 y cancela MFE builds
- `@if` / `@for` / `@switch` — Angular 17+ control flow, no necesita `CommonModule`

### API URLs
- `environment.apiUrls.sales` → `/sales` (microshopventas)
- `environment.apiUrls.purchases` → `/purchases` (microshopcompras)
- `environment.apiUrls.users` → `/users` (microshopusers)
- **NUNCA** `environment.apiUrl` (es `''` — envía al router Angular, no al backend)

### Autenticación
- `authService.currentUser()?.activeCompanyId` para company ID del tenant
- **NO existe** `getCompanyId()` ni `authService.companyId`
- Feature flags: `authService.hasModule('COUPONS')` etc.

### Formularios y templates
- `($event.target as HTMLInputElement).value` → **NG5002** en templates; usar `$any($event.target).value`
- `formValue.campo instanceof Date` → **TS2358**; usar `typeof formValue.campo === 'string'`
- Dos FormGroup distintos en una variable → declarar `const fg: FormGroup = ...` con tipo explícito

### Rutas y componentes
- Cada lazy route con `loadComponent` necesita que existan AMBOS archivos: `.ts` Y `.html`
- Drawer/modal: usar `[isOpen]="showDrawer()"` como signal input; NO `@if` envolviendo el componente
- `PaginationChangeEvent` → importar desde `@shared/ui/pagination/pagination.component`

### Build / compilación
- `ng build` en bash falla con "Unsupported package manager: bun" (hook pre-commit GGA, no código roto)
- Imports `[]` sobrantes → **NG8113** → cancela MFE builds — eliminar siempre los que no se usen en template
- `PageResponse<T>`: meta bajo `res.page.totalElements` / `res.page.totalPages` (NO en `res.totalElements`). **Usar siempre helpers** `pageTotalElements(res)` y `pageTotalPages(res)` desde `@core/models/pagination.model` — soportan ambos shapes (legacy flat + Boot 3 nested) con fallback a 0

### Sistema de Diseño "Confianza" (tema único)
Bundle de referencia: `../sistemadisenio/` y `../.agent/design-system-v2/` (handoff Claude Design 2026-04-24).

- `styles.scss` es el único entry point — partials no incluidos con `@use` son invisibles en runtime
- **Tema único**: 3 variantes vía `data-theme` en `<html>`:
  - `confianza` (default storefront — Ink Blue #0B3D91 + Signal Orange #F08C00 + parchment #F7F6F3)
  - `confianza-dark` (storefront opcional — además agrega clase `.dark` para Tailwind variants)
  - `confianza-erp` (admin/POS — sidebar #0E1B2C + densidad alta)
- Tokens estructurales (spacing 4px, radii rounded 4–20px, sombras soft, type Inter+Source Serif 4) viven en `_design-system-tokens.scss` — NO duplicar en componentes
- Paleta y semánticas viven en `themes/_default.scss` — los 3 `data-theme` están ahí
- Tailwind v4 `@theme` en `_tailwind.scss` expone primitives (font-sans, spacing, radii, color-*)
- Variables consumibles desde componentes: `var(--color-primary)` / `var(--c-brand)` (alias corto)
- `ThemeService.applyThemeToDocument`: setea `data-theme` siempre; añade `.dark` solo en `confianza-dark`

#### Componentes ds-* (storefront atoms — `@shared/ui/ds`)
13 átomos del bundle: `ds-button`, `ds-product-card`, `ds-shop-header`, `ds-shop-footer`, `ds-top-bar`, `ds-badge`, `ds-price`, `ds-stars`, `ds-thumb`, `ds-category-nav`, `ds-category-tile`, `ds-account-shell`, `ds-wordmark`. Showcase en `/design-system`.

- **Storefront/auth/account/checkout** → siempre `ds-*`
- **ERP/admin/POS/módulos backend** → `<app-button>` legacy es válido (consume `--color-primary` y respeta `confianza-erp`); arquitectura "shared tokens, distinct themes" del propio bundle
- **NO usar Tailwind blue genérico** (`bg-blue-500`, `#3b82f6`) — usar siempre `var(--color-primary)` o `bg-primary`

### POS module
- `ViewEncapsulation.None` — sub-componentes NO usar clases admin; usar Tailwind con tokens POS
- Offline con **Dexie.js** (IndexedDB) — ver `pos/services/pos-offline.service.ts`

## i18n
- `TranslatePipe` de `@ngx-translate/core` en componentes ERP
- Keys en `es.json` / `en.json` bajo `"modulo.feature.*"`
