import { InventoryCountRequest } from '../../models/inventory.models';

/** Una fila del FormArray de detalle (`form.getRawValue().details`). */
export type ConteoDetalleFormValue = {
    productId: number | string | null;
    countedQuantity: number | string | null;
    notes: string;
};

/** Valores crudos del formulario de alta del conteo (`form.getRawValue()`). */
export type ConteoFormValue = {
    warehouseId: number | string | null;
    countDate: string;
    notes: string;
    details: ConteoDetalleFormValue[];
};

/**
 * Arma el alta de un conteo físico.
 *
 * REGLA DE NEGOCIO: la cantidad contada `0` es el resultado más importante del conteo
 * («el sistema dice que hay stock y en el estante no hay nada») y por eso se normaliza con
 * `Number()` y NO se descarta como si fuera un campo vacío: perderla convertiría un faltante
 * total en «línea no contada». Las notas, en cambio, en blanco no viajan.
 */
export function conteoCrearPayload(v: ConteoFormValue): InventoryCountRequest {
    return {
        warehouseId: Number(v.warehouseId),
        countDate: v.countDate,
        notes: v.notes || undefined,
        details: v.details.map((d) => ({
            productId: Number(d.productId),
            countedQuantity: Number(d.countedQuantity),
            notes: d.notes || undefined
        }))
    };
}
