---
name: parallel-waves-integration-review
description: Al revisar sesiones de olas paralelas de agentes en MicroShop, revisar estos 6 huecos que el compilador NO detecta
metadata:
  type: feedback
---

Cuando varias olas de agentes paralelos "consistencian" un módulo (backend + frontend), el
compilador limpio (`mvnw compile` / `tsc --noEmit`) NO cubre 6 clases de hueco recurrentes.
Revisar SIEMPRE estas 6, en este orden:

1. **Endpoint backend sin consumidor frontend.** La ola de backend agrega `PUT /{id}` y la de
   frontend no cablea el service/acción → feature a medias que parece "hecha". Verificar con
   grep del path en `app-shop/src/app/features/**` y en el `*.service.ts` del dominio.
2. **Estado nuevo sin seed de catálogo.** Un estado nuevo (`RECHAZADA`, `CANCELADA`) escrito por
   el backend pero ausente de `microshopusers/.../V*__seed_catalogos*.sql` → la UI lo muestra con
   el código crudo (`catalog.label()` cae al fallback) y el filtro de estados no lo ofrece.
3. **Archivos nuevos sin `git add`.** Migraciones Flyway y DTOs nuevos salen como `??` en
   `git status`; un `git commit -am` los deja fuera → arranque roto (columna `@Version` inexistente).
4. **Lock pesimista tomado después de una lectura previa en la misma TX.** Si un método público
   A (`@Transactional`) llama a B que lee sin lock y luego a C que hace `...ForUpdate`, la entidad
   ya está en el L1 cache y el `FOR UPDATE` no refresca el estado → la protección TOCTOU no aplica
   al entry point A.

5. **Side-effect "best-effort" insertado dentro de un `@Transactional` ajeno.** Una ola agrega
   "también registrá X al hacer Y" llamando a otro `@Transactional` (propagación REQUIRED por
   defecto). Si ese servicio lanza (guard de idempotencia, `NotFoundException`, validación), el
   interceptor de la llamada interna marca la TX **rollback-only** → se aborta la operación
   PRIMARIA (cambio de estado + evento outbox), y **un `try/catch` NO alcanza** (el commit
   externo revienta con `UnexpectedRollbackException`). Verificar que el enriquecimiento corra
   en `PROPAGATION_REQUIRES_NEW` + errores contenidos, patrón que el repo ya usa.
6. **Cambio de tipo de excepción en un helper `static` → rompe el `catch` que localizaba (i18n).**
   Un agente "moderniza" `IllegalArgumentException` → `BusinessException` en un
   `fromString()`/validador static; el caller tenía un `catch` que envolvía el mensaje con
   `MessageHelper.get("<key>")`. Al cambiar el tipo, el catch queda muerto y el usuario recibe
   un string hardcodeado en español. Verificar con grep de la key i18n: si existe en
   `messages_es/_en.properties` y ya nadie la usa, hay regresión.

**Why:** revisión de la consistenciación de compras (8 olas, 2026-07-26) para los patrones 1-4, y
de inventario/logística ronda 2 (8 olas, 2026-07-26) para 5-6. En los tres casos todos los repos
compilaban EXIT 0 y aun así había hallazgos reales.

**How to apply:** en cualquier review post-olas, correr estas 6 verificaciones antes de mirar
estilo o naming. Ver [[project-compras-consistenciacion-2026-07-26]] y
[[project-inventario-logistica-ronda2-2026-07-26]].
