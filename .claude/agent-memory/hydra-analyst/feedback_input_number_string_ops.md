---
name: feedback-input-number-string-ops
description: input type=number con formControlName entrega number|null, no string; funciones de formulario que hacen .trim() revientan en silencio y los specs con literales string no lo ven
metadata:
  type: feedback
---

`<input type="number" formControlName="x">` usa NumberValueAccessor: el valor pasa a `number` (o `null` si se vacía) en cuanto el usuario lo toca, aunque el FormGroup se haya inicializado con `''` y sea `nonNullable`. Si el mapeo extraído a `*.form.ts` hace `f.x.trim()`, el submit lanza TypeError antes del POST, sin mensaje para el usuario.

**Why:** N3/N4 (2026-11-10), Libro de Reclamaciones: con «monto reclamado» informado no se podía registrar el reclamo. tsc, ng build y 976 tests en verde: el spec probaba con strings.

**How to apply:** al revisar un form extraído a función pura, grep `type="number"` en el template y contrastar con el tipo de la interfaz `Valores…` (string vs number). Ver también [[feedback-review-form-lock-audits]].
