/**
 * Traducción de los filtros del toolbar de stock a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: `estadoStock` es un filtro DERIVADO en el backend (compara cantidad
 * contra mínimo/punto de reorden) y sus únicos valores válidos son BAJO_MINIMO, REORDEN y
 * NORMAL; la cadena vacía significa «sin filtrar» y no debe viajar. El almacén ya llega como
 * número desde el componente, así que `undefined` es directamente «todos los almacenes».
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type StockFiltrosUI = {
    warehouseId: number | undefined;
    estadoStock: string;
    updatedAtDesde: string | null;
    updatedAtHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type StockFiltrosQuery = {
    warehouseId?: number;
    estadoStock?: string;
    updatedAtDesde?: string;
    updatedAtHasta?: string;
};

export function stockFiltrosParams(f: StockFiltrosUI): StockFiltrosQuery {
    return {
        warehouseId: f.warehouseId,
        estadoStock: f.estadoStock || undefined,
        updatedAtDesde: f.updatedAtDesde || undefined,
        updatedAtHasta: f.updatedAtHasta || undefined
    };
}
