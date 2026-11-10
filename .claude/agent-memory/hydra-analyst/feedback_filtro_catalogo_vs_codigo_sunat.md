---
name: feedback-filtro-catalogo-vs-codigo-sunat
description: Filtros de catálogo (FACTURA/BOLETA) contra columnas con código SUNAT ('01'/'03') devuelven 0 filas; y [checked] no se revierte tras error si el valor no cambia
metadata:
  type: feedback
---

Al revisar un filtro nuevo, contrastar el **valor** que emite la opción contra el **dato en BD** (psql), no sólo el nombre del parámetro.
`catalogFilter(catalog,'TIPO_COMPROBANTE',…)` emite `FACTURA`/`BOLETA` (CatalogOptionDto.codigo); `registro_compras/registro_ventas.voucher_tipo` guarda `'01'`/`'03'` → el filtro nunca encuentra nada y compila/tests en verde (N5, 2026-11-10).

Segunda trampa de la misma revisión: un checkbox con `[checked]="mapa()[k] === true"` cuyo `error` hace `mapa.update(m => ({...m}))` NO se repinta — Angular compara el valor de la expresión (sigue `false`) y no reescribe el DOM; queda marcado con el dato apagado. Revertir con `target.checked = !valor`.

**Why:** ambas pasan tsc, ng test y build; sólo se ven leyendo la BD o pensando en el ciclo de binding.
**How to apply:** en cada filtro nuevo, `select distinct <col>` y comparar con las opciones; en cada toggle optimista, mirar la rama de error. Ver [[feedback-verb-endpoint-mismatch]].
