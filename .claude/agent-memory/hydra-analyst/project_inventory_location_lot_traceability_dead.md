---
name: inventory-location-lot-traceability-dead
description: En invalmacen (microshoplogistica) los campos lotId/serialNumberId/locationId se aceptan en los request DTOs pero NINGÚN command service los persiste — la trazabilidad por ubicación/lote del inventario está muerta end-to-end
metadata:
  type: project
---

El módulo de inventario (`com.microshop.invalmacen`, puerto 8090, schema `dbshopinvalmacen`)
declara `lotId` / `serialNumberId` / `locationId` en `InventoryMovementRequest` y en
`InventoryCountDetailRequest`, y las entidades tienen las relaciones (`InventoryMovementEntity`
lot/serialNumber/location, `InventoryStockEntity.location`), pero **ningún command service las
setea**: `InventoryMovementService.createMovement`, `InventoryCountCommandService` y
`InventoryStockService.getOrCreateStock` construyen las entidades sin esos campos.

Consecuencia observable (verificado 2026-07-28): el frontend SÍ envía `locationId` (putaway en
`movement-management`), y el backend lo descarta en silencio; las columnas "Ubicación"/"Lote" de
stock-view, kardex y el detalle de conteo siempre muestran "—", y el filtro `locationId` de
movimientos/stock nunca matchea nada.

**Why:** es un caso de "DTO acepta → servicio ignora", invisible leyendo solo el DTO o solo el
frontend; el auditor de paridad lista↔formulario lo reportó como campos "faltan" en la UI cuando
la causa real es backend. Cualquier intento de "cerrar el gap" agregando un select de ubicación en
el drawer no cambiaría nada.

**How to apply:** ante un pedido de "abrir/registrar ubicación o lote" en inventario, verificar
primero el command service (no el DTO) antes de estimar; el trabajo es Java, no Angular. Mismo
chequeo antes de creer que un filtro por ubicación "no funciona por un bug del front".

Relacionado: [[reference-gaps-json-audit-snapshot]]
