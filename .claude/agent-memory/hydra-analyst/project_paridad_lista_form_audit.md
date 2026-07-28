---
name: paridad-lista-form-audit
description: Auditoría de paridad "lista ↔ drawer" de 91 pantallas — inventario en .claude/workspace/tmp/gaps.json es una FOTO VIEJA; verificar contra código antes de actuar
metadata:
  type: project
---

El inventario de gaps de paridad lista↔formulario vive en
`C:/WINSTON/PRACTICAS/01-start/.claude/workspace/tmp/gaps.json`
(claves: `admin`, `compras`, `invlog`, `conttes`, `rrhhpos`). NO se actualiza tras las olas de arreglos.

**Why:** se auditaron las 91 pantallas del ERP una sola vez y después se hicieron varias olas de
fixes sin refrescar el JSON. En el grupo logística (2026-07-28) ~68% de las entradas ya estaban
resueltas; en el grupo `compras` (2026-07-28) ~42 de ~58 → tratar el JSON como hecho manda a
"arreglar" cosas que ya funcionan.

**How to apply:** al usar `gaps.json`, verificar SIEMPRE contra el código actual (`file:line`) antes
de reportar o implementar. Dos fuentes de falso positivo sistemáticas:
1. entradas de `bloquear` sobre páginas que **no tienen drawer de edición** (solo alta o solo
   workflow) → nada que bloquear, la entrada es ruido;
2. entradas de `faltan` que son campos autogenerados/calculados por el backend (tracking, correlativo
   SUNAT, timestamps de auditoría, métricas de performance) → deben seguir read-only.

Alcance por clave: `invlog` MEZCLA inventario (`features/inventory/pages/`) con logística
(`features/logistica/pages/`) → filtrar antes de repartir trabajo. En el sub-grupo inventario
(2026-07-28) ~95% de las entradas ya estaba resuelto: de 78 gaps, 74 cerrados; los 4 abiertos NO
eran de UI sino de backend (ver [[inventory-location-lot-traceability-dead]]).

3. entradas de `faltan` ya resueltas con el patrón aceptado del proyecto: el campo calculado/de workflow
   se muestra como `<input readonly>` informativo DENTRO del drawer (asientos, presupuesto, cajas) — no se
   abre a edición. Si está readonly, el gap está cerrado.

Datos por grupo: logística ~68% ya resuelto; `conttes` (contabilidad+tesorería, 2026-07-28) ~97/115 ítems
resueltos, y los que sobreviven caen en 3 tipos: (a) detalle maestro-detalle que la UI nunca construyó
aunque el DTO lo acepta (`PresupuestoRequest.detalles` vs form que manda `detalles: []`), (b) reactivación
imposible: la acción es soft-delete (`DELETE`) y el request DTO no tiene flag `activo`/`active` (reglas de
asiento, asientos recurrentes), (c) sin `@PutMapping` → no existe edición posible (cajas, pagos, cuentas
PCGE, que además no tiene `CuentaContableRequestDto`).

Ver también [[gap-frontend-backend-verb-mismatch]].
