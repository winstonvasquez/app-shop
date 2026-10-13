import { CreateInspeccionDto, InspeccionItemDto, ItemCondicion, ItemDisposicion } from '../../models/devolucion.model';

/** Fila editable del formulario de inspección (una por producto devuelto). */
export interface InspeccionItemDraft {
    productoId: string;
    productoNombre: string;
    sku: string;
    cantidad: number | null;
    condition: ItemCondicion;
    disposition: ItemDisposicion;
    notes: string;
}

export function nuevaFilaInspeccion(productoId: string, productoNombre: string): InspeccionItemDraft {
    return { productoId, productoNombre, sku: '', cantidad: 1, condition: 'BUENO', disposition: 'RESTOCK', notes: '' };
}

/** Devuelve el mensaje del primer problema, o null si las filas son enviables. */
export function validarInspeccion(items: InspeccionItemDraft[], overallCondition: string): string | null {
    if (!overallCondition) return 'Indique la condición general.';
    if (items.length === 0) return 'Agregue al menos un producto inspeccionado.';
    for (const it of items) {
        if (!it.sku.trim()) return `Indique el SKU de «${it.productoNombre}».`;
        if (!it.cantidad || it.cantidad < 1 || !Number.isInteger(it.cantidad)) {
            return `La cantidad de «${it.productoNombre}» debe ser un entero mayor a 0.`;
        }
    }
    return null;
}

/** Arma el body de `POST /returns/{id}/inspection`. Asume `validarInspeccion` == null. */
export function armarInspeccionBody(
    returnRequestId: string, items: InspeccionItemDraft[], overallCondition: string, overallNotes: string,
): CreateInspeccionDto {
    return {
        returnRequestId,
        items: items.map((it): InspeccionItemDto => ({
            productoId: it.productoId,
            sku: it.sku.trim(),
            productoNombre: it.productoNombre,
            cantidad: it.cantidad ?? 0,
            condition: it.condition,
            disposition: it.disposition,
            notes: it.notes.trim() || undefined,
        })),
        overallCondition,
        overallNotes: overallNotes.trim() || undefined,
    };
}
