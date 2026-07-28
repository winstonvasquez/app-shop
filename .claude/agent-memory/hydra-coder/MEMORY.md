# hydra-coder memory — app-shop (MicroShop ERP)

## Project
- [Product-lookup pattern for productoId capture](project_product_lookup_pattern.md) — wiring ProductLookupComponent in plain-array vs FormArray reactive forms; productIdToUuid gotcha
- [Landing modules-section grouped by domain](project_landing_modules_by_domain.md) — forkJoin(plans,modules)+computed groups via MODULE_CONTENT/MODULE_DOMAINS/minPlanForModule, no takeUntilDestroyed (repo convention)
- [RRHH i18n gap + payroll correction pattern](project_rrhh_i18n_gap_and_payroll_correction.md) — microshopusers rrhh has ZERO i18n keys (msg.get() throws NoSuchMessageException); PUT /payroll/{id} added, shared calcularAportesPrevisionales

## Feedback
- [Orphan reactivation fix pattern](feedback_orphan_reactivation_pattern.md) — repo idiom for `activo` optional-filter (repo/controller/service/frontend layers), where the "default to active" behavior actually belongs
