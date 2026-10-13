import { InventoryTransferRequest } from '../../models/inventory.models';

/** Una fila del FormArray de detalle (`form.getRawValue().details`). */
export type TransferDetalleFormValue = {
    productId: number | string | null;
    requestedQuantity: number | string | null;
    notes: string;
};

/** Valores crudos del formulario de alta de transferencia (`form.getRawValue()`). */
export type TransferFormValue = {
    sourceWarehouseId: number | string | null;
    destinationWarehouseId: number | string | null;
    requestDate: string;
    notes: string;
    details: TransferDetalleFormValue[];
};

/**
 * Arma el alta de una transferencia entre almacenes.
 *
 * REGLA DE NEGOCIO: almacén origen, destino, fecha y las cantidades de cada línea son
 * obligatorios y viajan siempre; las notas (de cabecera y de línea) son opcionales y en
 * blanco NO deben viajar, para no grabar cadenas vacías donde el dominio dice «sin nota».
 * Los ids llegan del `<select>` como cadena y el backend los declara numéricos.
 */
export function transferCrearPayload(v: TransferFormValue): InventoryTransferRequest {
    return {
        sourceWarehouseId: Number(v.sourceWarehouseId),
        destinationWarehouseId: Number(v.destinationWarehouseId),
        requestDate: v.requestDate,
        notes: v.notes || undefined,
        details: v.details.map((d) => ({
            productId: Number(d.productId),
            requestedQuantity: Number(d.requestedQuantity),
            notes: d.notes || undefined
        }))
    };
}
