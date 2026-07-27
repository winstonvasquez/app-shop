---
name: project-inventario-logistica-ronda2-2026-07-26
description: Review de integración ronda 2 de inventario/logística (8 olas paralelas, 2026-07-26) — 1 bug P1 real arreglado, resto verde
metadata:
  type: project
---

2026-07-26: revisión de integración de la RONDA 2 de consistenciación de inventario/logística
(ronda 1 ya commiteada). 8 tareas paralelas sobre `microshoplogistica` + `app-shop` + una
migración de catálogo en `microshopusers`. **Resultado: 1 bug P1 nuevo, 3 fixes menores, 0
bloqueantes de arquitectura.**

El P1 fue el más interesante: la ola de "wiring de costos de envío" insertó
`shippingCostCommandService.registrarCosto()` dentro de la TX de `ShipmentCommandService.updateStatus()`.
Ese servicio tiene un guard de idempotencia que lanza `BusinessException` si ya existe un registro
de costo para el envío → con propagación REQUIRED marcaba rollback-only y abortaba el despacho
completo (estado + tracking + evento outbox `SHIPMENT_DISPATCHED`, del que depende la GRE
automática). Ver patrón 5 de [[parallel-waves-integration-review]].

Dos observaciones que NO son bugs pero conviene recordar si se retoma:
- El bypass `ROLE_INTERNAL_SERVICE` agregado al `TenantAccessAspect` de logística **no tiene ningún
  llamador s2s hoy** (los 24 `@RequiresTenantAccess` del servicio solo se consumen desde el
  frontend). Es defensa a futuro; el `roles` claim del JWT se mapea verbatim a authorities, así que
  el bypass también aplicaría a un usuario con un rol de BD llamado `internal_service`
  (`RolController` es solo-GET, así que no es creable por API).
- El stream SSE de notificaciones de logística (`getStream()`) sigue **sin ningún consumidor** en
  `app-shop` — era así antes de la ronda 2 también. El trabajo de ticket-auth endureció un endpoint
  que nadie usa.

**Why:** el usuario pidió específicamente revisión de *interacción entre tareas paralelas*, no
re-auditoría; la compilación limpia de los 3 repos ya estaba confirmada.

**How to apply:** si se retoma "inventario/logística", verificar primero con `git log` si el P1 de
`registrarCostoEnvio` y los 3 fixes menores llegaron a commitearse (al cierre de esta sesión los 3
repos estaban SIN commitear, con archivos nuevos aún sin `git add`).
