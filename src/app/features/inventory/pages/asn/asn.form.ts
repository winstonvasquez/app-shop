import { CreateAsnLineRequest, CreateAsnRequest, ReceiveAsnLine } from '../../services/inventory-api.service';

/** Línea en construcción dentro del drawer de creación de ASN. */
export interface AsnLineDraft {
    productId: number;
    productName: string;
    sku?: string;
    expectedQuantity: number;
    unitCost?: number;
}

/** Valores crudos del formulario de cabecera del ASN (`form.getRawValue()`). */
export type AsnFormValue = {
    supplierName: string;
    referenceDocument: string;
    warehouseId: number | string | null;
    expectedDate: string;
    notes: string;
};

/**
 * Arma el alta de un ASN a partir del formulario y las líneas del drawer.
 *
 * REGLA DE NEGOCIO: sólo el almacén destino es obligatorio; proveedor, documento de
 * referencia, fecha esperada y notas son opcionales y, en blanco, NO deben viajar
 * (mandar `''` grabaría una cadena vacía en el ASN en vez de dejar el campo nulo).
 * El costo unitario de una línea es opcional de verdad: `0` es un costo válido y se
 * conserva; sólo se omite cuando no se cargó nada.
 */
export function asnCrearPayload(v: AsnFormValue, lineas: AsnLineDraft[]): CreateAsnRequest {
    const lines: CreateAsnLineRequest[] = lineas.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        expectedQuantity: Number(l.expectedQuantity),
        unitCost: l.unitCost != null ? Number(l.unitCost) : undefined
    }));
    return {
        supplierName: v.supplierName || undefined,
        referenceDocument: v.referenceDocument || undefined,
        warehouseId: Number(v.warehouseId),
        expectedDate: v.expectedDate || undefined,
        notes: v.notes || undefined,
        lines
    };
}

/**
 * Cantidades a confirmar en la recepción de un ASN.
 *
 * REGLA DE NEGOCIO: por defecto se recibe lo esperado, pero un `0` tecleado por el
 * operario es una recepción legítima («llegó la guía, no llegó la mercadería») y NO
 * debe sustituirse por lo esperado — de ahí `??` y no `||`.
 */
export function asnRecibirLineas(
    lineas: { id: number; expectedQuantity: number }[],
    cantidades: Record<number, number>
): ReceiveAsnLine[] {
    return lineas.map((l) => ({
        lineId: l.id,
        receivedQuantity: cantidades[l.id] ?? l.expectedQuantity
    }));
}
