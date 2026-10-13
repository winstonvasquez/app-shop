/**
 * Traducción de los filtros del toolbar de conteos físicos a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: «no elegido» llega como cadena vacía (selects y búsqueda) o `null`
 * (extremos de los rangos de fecha) y no debe viajar. El almacén se elige en un `<select>`
 * que entrega cadenas, pero el backend lo declara numérico.
 * Los dos rangos son independientes: fecha de conteo y fecha de ajuste no son el mismo hecho
 * (un conteo puede estar contado y aún no ajustado).
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type ConteosFiltrosUI = {
    q: string;
    status: string;
    warehouseId: string;
    countDateDesde: string | null;
    countDateHasta: string | null;
    adjustedDateDesde: string | null;
    adjustedDateHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type ConteosFiltrosQuery = {
    q?: string;
    status?: string;
    warehouseId?: number;
    countDateDesde?: string;
    countDateHasta?: string;
    adjustedDateDesde?: string;
    adjustedDateHasta?: string;
};

export function conteosFiltrosParams(f: ConteosFiltrosUI): ConteosFiltrosQuery {
    return {
        q: f.q || undefined,
        status: f.status || undefined,
        warehouseId: f.warehouseId ? Number(f.warehouseId) : undefined,
        countDateDesde: f.countDateDesde || undefined,
        countDateHasta: f.countDateHasta || undefined,
        adjustedDateDesde: f.adjustedDateDesde || undefined,
        adjustedDateHasta: f.adjustedDateHasta || undefined
    };
}
