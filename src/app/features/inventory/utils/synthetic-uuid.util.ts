/**
 * Conversión Long↔UUID sintético para el `productId`/`varianteId` del catálogo de ventas
 * envuelto como UUID en las entidades de `com.microshop.logistica`.
 *
 * La implementación canónica vive en `@core/utils/synthetic-uuid.util` — la misma conversión
 * la necesitan tesorería/compras/contabilidad y llegó a estar triplicada. Aquí se conservan
 * los nombres de dominio (`productIdToUuid`) porque son los que leen las pantallas de
 * inventario, pero delegan: no hay una segunda implementación que pueda divergir.
 */
import { longToSyntheticUuid, syntheticUuidToLong } from '@core/utils/synthetic-uuid.util';

export function productIdToUuid(id: number): string {
    return longToSyntheticUuid(id);
}

/** Inverso de productIdToUuid — recupera el Long original desde el UUID sintético. */
export function uuidToProductId(uuid: string): number {
    return syntheticUuidToLong(uuid);
}
