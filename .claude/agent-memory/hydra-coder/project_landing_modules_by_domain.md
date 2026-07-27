---
name: project-landing-modules-by-domain
description: Landing page modules-section refactor from flat grid to backend-driven domain groups (2026-07-26)
metadata:
  type: project
---

`landing-page.component.ts` `.modules-section` refactored from a hardcoded flat `ModuleCard[]` array to a backend-driven, domain-grouped layout.

- Data source: `forkJoin({ plans: PortalService.getPlans(), modules: PortalService.getModules() })` in `ngOnInit`, populating `signal<SaasPlanInfo[]>` / `signal<SaasModuleInfo[]>`.
- Grouping: `computed<DomainGroupView[]>` maps `MODULE_DOMAINS` (fixed order: comercial, cadena-suministro, finanzas, personas) and filters `modules()` by `MODULE_CONTENT[code].domain`, enriching each with `purpose`/`capabilities` from `MODULE_CONTENT` and `minPlan` from `minPlanForModule(code, plans())`. Groups with 0 modules are filtered out (harmless while forkJoin hasn't resolved yet — page renders header/hero, module section fills in once data arrives).
- Accent colors: kept as a local `MODULE_ACCENT_COLORS` const (not from backend) — same 8 hardcoded hex values as before, since `SaasModuleInfo` has no color field.
- Icon `@switch` on `mod.code` preserved verbatim (8 cases) — reused as-is, just moved one level deeper into the per-group `@for`.

**Why:** task explicitly forbade hardcoding which plan includes which module — must always derive from `minPlanForModule` against real backend `moduleCodes`, and forbade inventing security/limit copy beyond `SECURITY_BASELINE`/`UNLIMITED_ACROSS_PLANS` constants.

**How to apply:** if asked to touch other portal pages (pricing, module detail) that need plan/module copy, reuse the same three constants (`MODULE_CONTENT`, `MODULE_DOMAINS`, `minPlanForModule`) rather than re-deriving groupings inline — keeps domain grouping and plan-gating logic in one place (`saas-plan-catalog.constants.ts`).

No unsubscribe/`takeUntilDestroyed` used for the `forkJoin` subscribe — matches existing repo convention (checked `dashboard-tesoreria`, `carrier-sla-management`, `slider-manager` — none use it for one-shot ngOnInit data fetches).
