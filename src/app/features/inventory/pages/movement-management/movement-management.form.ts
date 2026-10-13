import { InventoryMovementRequest, InventoryMovementType } from '../../models/inventory.models';

/** Valores crudos del formulario de alta de movimiento (`form.getRawValue()`). */
export type MovimientoFormValue = {
    productId: number | string | null;
    warehouseId: number | string | null;
    movementType: string;
    quantity: number | string | null;
    unitCost: number | string | null;
    movementDate: string;
    reason: string;
    referenceType: string;
    referenceNumber: string;
    locationId: number | string | null;
};

/**
 * Arma el alta de un movimiento de inventario (entrada o salida del kardex).
 *
 * REGLA DE NEGOCIO: producto, almacén, tipo, cantidad y fecha son obligatorios y viajan
 * siempre. `unitCost` y `locationId` son opcionales de verdad y se distinguen por `!= null`,
 * no por veracidad: un costo unitario de `0` (mercadería en consignación, muestra gratuita)
 * y la ubicación con id `0` son valores válidos que `|| undefined` borraría. Motivo y datos
 * de referencia son texto libre: en blanco no viajan.
 */
export function movimientoCrearPayload(v: MovimientoFormValue): InventoryMovementRequest {
    return {
        productId: Number(v.productId),
        warehouseId: Number(v.warehouseId),
        movementType: v.movementType as InventoryMovementType,
        quantity: Number(v.quantity),
        unitCost: v.unitCost != null ? Number(v.unitCost) : undefined,
        movementDate: v.movementDate,
        reason: v.reason || undefined,
        referenceType: v.referenceType || undefined,
        referenceNumber: v.referenceNumber || undefined,
        locationId: v.locationId != null ? Number(v.locationId) : undefined
    };
}
