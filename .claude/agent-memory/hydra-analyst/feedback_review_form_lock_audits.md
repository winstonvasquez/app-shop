---
name: review-form-lock-audits
description: Heurística de revisión para auditorías "lista ↔ drawer" en el ERP — dónde suelen quedar los huecos reales tras una ola de arreglos
metadata:
  type: feedback
---

Al re-verificar inventarios de paridad lista↔formulario (gaps.json), tres patrones producen
casi todos los hallazgos que siguen abiertos; el resto del inventario suele estar ya cerrado.

1. `bloquearEnEdicion(form, campos, ...)` invocado SOLO en el camino de alta (`openCreateModal`)
   y olvidado en `openEditModal` → el campo nunca se bloquea. Verificar que existan AMBAS llamadas
   (`false` en alta, `true` en edición), no basta con que el import exista.
2. Pantallas *detalle* que duplican el formulario de la lista (p.ej. `company-detail` vs `companies`)
   no heredan los bloqueos; hay que revisarlas por separado.
3. Métodos de servicio sin ningún llamador (`assignUserToCompany`) = capacidad de backend sin UI.
   Un grep del nombre del método en `app-shop/src` distingue "ya existe" de "no hay pantalla".
4. **FK como `<input>` de UUID a mano** (`placeholder="UUID de la OC"`, `"UUID del producto"`).
   El inventario NUNCA lo marca porque el control SÍ existe, pero el usuario no puede conocer el
   UUID → la pantalla es inoperable. Buscar `placeholder="UUID` en los .html del módulo y comparar
   con las páginas ya migradas a `<app-server-search-select>` / `<app-product-lookup>`.
5. **Campo `@NotNull` del request DTO que el form no envía** → todo POST devuelve 400 y el handler
   lo come en silencio (`error: () => this.saving.set(false)`). Al revisar un alta, cruzar los
   controles del FormGroup contra los `@NotNull`/`@NotBlank` del record Java, no solo contra
   las columnas de la lista.

**Why:** el inventario de la auditoría es una foto vieja; reportar un gap ya resuelto manda a
alguien a "arreglar" código que funciona, y eso cuesta más que omitir un gap menor.

**How to apply:** para cada campo de `bloquear`, grepear las dos llamadas a form-lock en el .ts
antes de declararlo abierto. Para cada campo de `faltan`, buscar el `formControlName` en el .html
del drawer y, si no está, confirmar en el request DTO Java si el campo siquiera se acepta.
Ojo: al añadir un bloqueo hay que pasar el submit a `getRawValue()` (un control disabled
desaparece de `form.value`) — ver `@shared/utils/form-lock`.
