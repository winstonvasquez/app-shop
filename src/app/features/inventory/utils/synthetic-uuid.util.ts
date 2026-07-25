/**
 * Conversión Long↔UUID sintético, espejo exacto de `new UUID(0, id)` en Java
 * (patrón usado en microshoplogistica para envolver el productId/varianteId
 * Long del catálogo de ventas como UUID en las entidades de `com.microshop.logistica`).
 * Con mostSigBits=0, el string resultante siempre es
 * "00000000-0000-0000-0000-" + id en hex (12 dígitos, zero-padded).
 */
export function productIdToUuid(id: number): string {
    return `00000000-0000-0000-0000-${id.toString(16).padStart(12, '0')}`;
}

/** Inverso de productIdToUuid — recupera el Long original desde el UUID sintético. */
export function uuidToProductId(uuid: string): number {
    const hex = uuid.split('-').pop() ?? '0';
    return parseInt(hex, 16);
}
