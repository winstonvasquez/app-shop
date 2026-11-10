---
name: feedback_plan_cuentas_parcial_y_receptores_nuevos
description: Al revisar un receptor contable nuevo, contar las cuentas por empresa en psql; un plan parcial bloquea el seed lazy y los "Probar asiento" pasan a contabilizar de verdad
metadata:
  type: feedback
---

Al revisar un receptor de asientos nuevo (tipos que antes daban 400), verificar dos cosas que ni el compilador ni los tests ven:

1. **Plan de cuentas por empresa en psql**: `select company_id,count(*) from dbshopcontabilidad.cuentas_contables group by 1`. En 2026-11 las empresas 2 y 3 tenían 15 cuentas frente a 233 de la empresa 1. `ensurePcgeSeeded` sólo siembra si el count es 0, y cada migración tipo V21/V25 que añade «sólo a empresas con plan» deja el plan parcial para siempre. Por eso faltaban 201 y 411: el AJUSTE de inventario acababa en DEAD_LETTER y el pago de planilla (con su asiento en la misma TX) no se podía ejecutar.
2. **Quién más llama al endpoint con ese tipo**: el botón «Probar asiento» de logística mandaba el tipo real con una referencia aleatoria. Mientras el receptor daba 400 era inocuo; desde que lo acepta, cada clic crea un asiento real.

**Why:** revisión N5 (2026-11-10). Las dos cosas se pasaron por alto con la suite en verde y con 0 endpoints sin guard.
**How to apply:** en cualquier ola que amplíe /automatico o asientoPago/asientoCobro, contar las cuentas por empresa y buscar con grep los llamadores del tipo nuevo (incluidos los endpoints de prueba). Relacionado: [[feedback_parallel_waves_integration_review]].
