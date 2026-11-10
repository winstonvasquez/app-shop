# hydra-analyst — memoria

## Metodología de review
- [Review de integración post-olas paralelas](feedback_parallel_waves_integration_review.md) — 6 huecos que el compilador no detecta: endpoint sin consumidor, estado sin seed, sin `git add`, lock tras lectura, rollback-only por side-effect, i18n roto por cambio de excepción

## Patrones de bug recurrentes
- [Mismatch verbo/ruta frontend↔backend](feedback_verb_endpoint_mismatch.md) — tsc y mvnw no lo detectan; grep `Mapping(` del controller vs `this.http.<verbo>` del servicio
- [Auditorías lista↔drawer y form-lock](feedback_review_form_lock_audits.md) — 3 patrones concentran los gaps aún abiertos: lock solo en alta, pantalla-detalle duplicada, método de servicio sin llamador
- [Filtro de catálogo vs código SUNAT + [checked] sin revertir](feedback_filtro_catalogo_vs_codigo_sunat.md) — FACTURA≠'01' da 0 filas; toggle optimista queda marcado tras 403
- [input type=number + .trim() en *.form.ts](feedback_input_number_string_ops.md) — NumberValueAccessor da number|null; el submit revienta sin POST y los specs con strings no lo ven

## Trabajos revisados
- [Consistenciación compras 2026-07-26](project_compras_consistenciacion_2026-07-26.md) — 8 olas, 0 bloqueantes, 5 importantes (STOCK_ENTRY silencioso, lock one-click, presupuesto sin validar, endpoints sin FE, búsqueda contratos)
- [Inventario/logística ronda 2 2026-07-26](project_inventario_logistica_ronda2_2026-07-26.md) — 8 olas, 1 P1 (registrarCosto abortaba el despacho por rollback-only), bypass s2s sin llamador, SSE sin consumidor
- [Auditoría paridad lista↔drawer (gaps.json)](project_paridad_lista_form_audit.md) — el inventario es una foto vieja; ~68% ya resuelto en logística, verificar con file:line antes de actuar
- [Ola N5 backend 2026-11-10](project_ola_n5_backend_2026-11-10.md) — 0 P0/P1; semilla B001 invierte serie-por-sucursal, "probar asiento" persiste, residuo 121101 por redondeo
- [Trazabilidad ubicación/lote de inventario muerta](project_inventory_location_lot_traceability_dead.md) — invalmacen acepta lotId/locationId en los DTOs y ningún command service los persiste
- [Plan de cuentas parcial y receptores nuevos](feedback_plan_cuentas_parcial_y_receptores_nuevos.md) — contar cuentas por empresa en psql; el seed lazy no completa un plan parcial; «Probar asiento» pasa a contabilizar de verdad
