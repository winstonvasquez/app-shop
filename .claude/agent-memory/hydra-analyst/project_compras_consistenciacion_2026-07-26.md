---
name: project-compras-consistenciacion-2026-07-26
description: Review de integración de la consistenciación de compras (8 olas paralelas, 2026-07-26) — sin bloqueantes, 5 importantes
metadata:
  type: project
---

2026-07-26: revisión de integración (no de compilación) de la consistenciación del módulo compras.
33 archivos en `microshopcompras` + 26 en `app-shop/src/app/features/compras`, sin commitear.
**Resultado: 0 bloqueantes.** Los 5 hallazgos importantes fueron, en orden de riesgo:
recepción que descarta ítems sin `productoId` del STOCK_ENTRY en silencio; one-click de cotización
con lock inefectivo; `actualizarMontoAsignado` de presupuesto sin validar contra ejecutado+comprometido;
endpoints Contrato/Cotización `PUT/GET {id}` sin consumidor frontend; búsqueda de contratos a medias
tras pasar a paginación server-side.

**Why:** el usuario pidió luz verde o lista corta antes de cerrar la sesión; la compilación limpia ya
estaba confirmada y NO era lo que había que verificar.

**How to apply:** si en una sesión futura se retoman "los pendientes de compras", estos 5 son el
punto de partida — verificar primero si ya se arreglaron (`git log` de ambos repos) antes de
re-reportarlos. Metodología usada: [[parallel-waves-integration-review]].
