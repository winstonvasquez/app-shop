---
name: gap-frontend-backend-verb-mismatch
description: Clase de bug recurrente en este monorepo — el servicio Angular apunta a un verbo/ruta que el controller Spring no expone; ni tsc ni mvnw lo detectan
metadata:
  type: feedback
---

Al auditar una pantalla, comparar SIEMPRE verbo + ruta del servicio Angular contra los
`@GetMapping/@PostMapping/@PutMapping` del controller Java. No asumir que compilan = funcionan.

**Why:** `npx tsc --noEmit` y `./mvnw compile` pasan igual (son procesos separados, sin contrato
compartido) y el error solo aparece en runtime como 404/405 al hacer clic. Confirmado 2026-07-28 en
logística: `DeliveryRouteService.start()` hacía `POST /routes/{id}/start` contra un
`@PutMapping("/{id}/start")` → la acción "Iniciar ruta" era un 405 silencioso; y `generate()` posteaba
al root `/routes`, que no tiene ningún `@PostMapping` (el real es `/routes/generate`).

**How to apply:** en cualquier auditoría de pantalla, además de revisar el formulario, hacer
`grep -n "Mapping(" <X>Controller.java` y cruzarlo con los `this.http.<verbo>` del servicio. Un método
de servicio que nadie llama es señal de alarma extra: suele estar desalineado con el backend.

**Variantes de la misma clase (tesorería, 2026-07-28) — cotejar también el request DTO, no solo la ruta:**
1. *Ruta traducida*: `cajasService.open/close` → `/{id}/open` `/{id}/close`, pero `CashRegisterController`
   mapea `/{id}/abrir` `/{id}/cerrar` (+ `@RequestParam tenantId`) → 404. Ojo con los pares
   inglés/español en treasury.
2. *Campo `@NotNull`/`@NotBlank` del DTO que el form no tiene*: `CashRegisterRequestDto` exige `tenantId`
   y `moneda`; el `createForm` de cajas solo tiene `nombre` + `saldoInicial` → 400 al crear.
3. *Enum de dominio expuesto como `type="text"`*: `origen` en flujo-caja es texto libre
   ("Ej: Venta mostrador") contra `MovementOrigin {CAJA,BANCO,COBRO,PAGO,TRANSFERENCIA_INTERNA}` →
   `HttpMessageNotReadableException`. Las opciones válidas suelen estar YA en los `filters` de la lista.
4. *Campo del form inexistente en el DTO*: se pierde en silencio (Jackson ignora desconocidos). Ej.
   `cajaId` en flujo-caja; el DTO modela lo mismo como `origenId` + `origen=CAJA`.

Ver también [[paridad-lista-form-audit]].
