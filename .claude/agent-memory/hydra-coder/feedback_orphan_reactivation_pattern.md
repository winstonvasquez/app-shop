---
name: orphan-reactivation-pattern
description: How to fix "reactivación huérfana" (inactive record unreachable from list) in this repo's compras module
metadata:
  type: feedback
---

Fix for "reactivación huérfana" (P1 audit pattern, e.g. compras hallazgo #5 2026-07-27):
a checkbox/field to reactivate a soft-deleted (`activo=false`) record is dead code if the
list query only ever fetches `activo=true`.

**Why:** confirmed recurring pattern across compras module — `puntos-reorden` already had
it fixed; `config-aprobaciones` (niveles de aprobación) had the exact same bug (repo
`findByCompanyIdAndActivoTrueOrderByOrdenAsc`, no way to see inactive niveles).

**How to apply** (copy this exact shape, don't invent a new one):
- Repository: add a query method `findByXAndActivoFilter(id, Boolean activo)` using
  JPQL `(:activo IS NULL OR n.activo = :activo)` — same idiom already used elsewhere in
  this codebase for optional filters (`blankToNull` pattern in query services).
- Controller: `@RequestParam(required = false) Boolean activo` — **no** `defaultValue`.
  null = no filter (see `PuntoReordenController.listar`). Do NOT set a Spring
  `defaultValue="true"` on the backend — that breaks the "show all" (empty/undefined)
  case, since defaultValue only fires when the param is absent, not when the frontend
  needs both true and false semantics reachable via one signal.
- Frontend service: accept `activo?: boolean`, only append `HttpParams` when defined.
- Frontend component: `filterActivo` signal seeded to `'true'` (preserves prior default
  UX), with a `''` (Todos) option that maps to `undefined`. This is the layer where the
  "default to active" behavior actually lives — not the backend defaultValue.
- Don't forget the empty-state message: if it's conditioned on `niveles().length === 0`
  it must branch on the current filter (an "auto-aprobará" message is wrong when the
  user is filtering Inactivos and there happen to be none).

See also [[project_product_lookup_pattern]] for a related but distinct
FormArray-hidden-field gotcha (productoId/proveedorSugeridoId silently nulled on edit
if not round-tripped through the form).
