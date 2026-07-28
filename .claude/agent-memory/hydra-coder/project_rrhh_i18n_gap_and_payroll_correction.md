---
name: project-rrhh-i18n-gap-and-payroll-correction
description: microshopusers rrhh module has zero i18n keys defined (msg.get() throws NoSuchMessageException); payroll PUT correction pattern added 2026-07-28
metadata:
  type: project
---

## Systemic bug: rrhh module has NO i18n keys (discovered 2026-07-28)

`microshopusers` uses a custom `MessageSource` bean (`LocaleConfig.messageSource()`, basename
`classpath:i18n/messages`) with `useCodeAsDefaultMessage` NOT set (defaults false). Checked
`src/main/resources/i18n/messages.properties` + `messages_en.properties`: they contain ONLY
`com.microshop.users` keys (auth, company, segmento, theme). **Every single `msg.get("payroll.*")`
and `msg.get("evaluation.*")` call across `com.microshop.rrhh` references a key that does not
exist anywhere** → `MessageSource.getMessage()` throws `NoSuchMessageException` at runtime instead
of returning the intended string, turning what should be a clean 404/409/400 into an unhandled 500.

**Why:** discovered while fixing hallazgo 13 (EvaluationCommandService hardcoded string vs i18n
pattern) — converting the hardcoded string to `msg.get(key)` would have been a REGRESSION (500
instead of a working 404) unless the key actually exists. Verified by reading the properties files
directly, not by assumption.

**How to apply:** before ever "fixing" a hardcoded exception message in rrhh to use `msg.get(...)`,
grep `i18n/messages.properties` for that key first. If missing, add it there (base file only —
`messages_en.properties` is already known-stale/incomplete relative to the base file, so parity
isn't expected). The Java `ResourceBundle` fallback chain means the un-suffixed `messages.properties`
is the ultimate fallback for ANY locale, so adding the key there alone is sufficient. Fixed ONLY
`evaluation.criteria.not.found` (the one hallazgo cited, `EvaluationCommandService.activateCriteria`)
— did NOT touch the identical hardcoded string in `deactivateCriteria` (one line above) nor in
`createEvaluation`/`updateEvaluation`'s own "Criterio no encontrado" throws — same defect, left
unfixed per explicit scope-discipline instructions in that briefing. A full remediation of this
module needs someone to inventory every `msg.get()` call in `com.microshop.rrhh` and backfill keys.

## Payroll correction pattern (PUT /hr/api/payroll/{id}, added 2026-07-28)

`PayrollController`/`PayrollCommandService` previously had NO update endpoint — the frontend
"Corregir" button always POSTed (409 duplicate, since every row already has a boleta). Added
`updatePayroll(id, request)`: only allowed while `Payroll.PayrollStatus == GENERADO` (APROBADA
already fired tesorería payment + contabilidad asiento; PAGADA/CANCELADA are terminal). Recomputes
AFP/ONP/EsSalud/Renta 5ta via the SAME engine as `createPayroll`/`generatePayrollForPeriod`
(extracted `calcularAportesPrevisionales`/`aplicarAportesPrevisionales` — single source of truth,
see [[project_product_lookup_pattern]] for the general "don't duplicate a calc, extract it" pattern
already established in this repo). `createPayroll` (manual individual boleta) was ALSO silently
skipping this exact calculation before this fix — `PayrollMapper.toEntity` never set
afpOnp/montoAfpOnp/essalud/rentaQuinta, so a manually-created boleta had a legally wrong `neto`.

**Why:** legal/compliance risk (Peruvian payroll must include AFP/ONP + EsSalud + Renta 5ta), not
cosmetic — flagged explicitly in the briefing as the most important of 4 findings that session.

**How to apply:** any future payroll calc change (new deduction, rate source, etc.) must go into
`calcularAportesPrevisionales` — NOT be re-derived ad hoc in `createPayroll`/`updatePayroll`/
`calcularPlanillaPeruana`, or the three will diverge again exactly like before this fix.
