/**
 * Traducción de los filtros del toolbar de movimientos a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: aquí los ids ya son numéricos en la UI (el componente los convierte al
 * recibir el evento del filtro), así que `undefined` ya significa «no elegido» y no hay nada
 * que normalizar en ellos. Lo que sí hay que traducir son los filtros de TEXTO —tipo de
 * movimiento, tipo de referencia y búsqueda libre—, que llegan como cadena vacía cuando el
 * usuario no eligió y no deben viajar.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type MovimientosFiltrosUI = {
    q: string;
    warehouseId: number | undefined;
    movementType: string;
    referenceType: string;
    locationId: number | undefined;
    productId: number | undefined;
    movementDateDesde: string | undefined;
    movementDateHasta: string | undefined;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type MovimientosFiltrosQuery = {
    q?: string;
    warehouseId?: number;
    movementType?: string;
    referenceType?: string;
    locationId?: number;
    productId?: number;
    movementDateDesde?: string;
    movementDateHasta?: string;
};

export function movimientosFiltrosParams(f: MovimientosFiltrosUI): MovimientosFiltrosQuery {
    return {
        warehouseId: f.warehouseId,
        movementType: f.movementType || undefined,
        referenceType: f.referenceType || undefined,
        locationId: f.locationId,
        productId: f.productId,
        movementDateDesde: f.movementDateDesde,
        movementDateHasta: f.movementDateHasta,
        q: f.q || undefined
    };
}
