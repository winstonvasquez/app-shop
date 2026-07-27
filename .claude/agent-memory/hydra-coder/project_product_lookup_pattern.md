---
name: product-lookup-pattern
description: Cómo wirear app-product-lookup para capturar productoId en formularios de compras (plain array vs FormArray reactive)
metadata:
  type: project
---

Patrón para capturar `productoId` (evita pérdida silenciosa de stock cuando un item de
compras se convierte río abajo en OC → Recepción → STOCK_ENTRY sin productoId).

Componente reutilizable: `ProductLookupComponent` en
`src/app/features/inventory/components/product-lookup/product-lookup.component.ts`.
Emite `selected: output<ProductResponse>()`. `ProductResponse.id` es `number` (catálogo
ventas) — para persistir como UUID sintético en compras/logística usar
`productIdToUuid(id)` de `src/app/features/inventory/utils/synthetic-uuid.util.ts`
(espejo de `new UUID(0, id)` en Java). No confundir con el `sku` — `ProductResponse` NO
tiene campo `sku`, solo `nombre`/`precioBase`.

Mecánica de wiring (dos variantes vistas en `compras/pages/`):

1. **Array plano de signals** (`ordenes-compra.component.ts`, `OcItemForm[]` vía
   `formItems = signal<OcItemForm[]>([])`): `lookupOpenIndex = signal<number|null>(null)`
   + `toggleLookup(index)` + `onProductoSeleccionado(index, product)` que llama
   `updateItem(index, 'productoId', productIdToUuid(product.id))`.

2. **FormArray reactive** (`cotizaciones.component.ts`, `itemsArray` de `FormGroup`s):
   mismo `lookupOpenIndex` signal, pero `onProductoSeleccionado` usa
   `this.itemsArray.at(index).patchValue({ productoId, productoNombre })` en vez de
   mutar un array plano. Cada `FormGroup` de item necesita un `FormControl('productoId')`
   agregado en el builder (`createItemGroup()`), aunque no haya `<input>` visible para
   ese campo — solo se llena via patchValue del lookup.

En el HTML, el botón lookup (🔍) va al lado del input de nombre de producto; al togglear
se abre una fila/bloque con `<app-product-lookup (selected)="onProductoSeleccionado($index, $event)" />`.
Cerrar el panel tras seleccionar (`lookupOpenIndex.set(null)`) y también al cerrar el
form/drawer o remover el item (si el índice removido coincide con el abierto).

Ver también [[feedback_backend_export_pattern]] si existe, y el hallazgo original de
integración: cotizaciones nunca capturaba `productoId` → `CotizacionCommandService.convertirAOrdenCompra`
(backend) copiaba `null` → Recepción → backend omite del `STOCK_ENTRY` → stock nunca entra
en silencio. Fix aplicado 2026-07-26.
