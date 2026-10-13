/**
 * Traducción de los filtros del toolbar de transferencias a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: «no elegido» llega como cadena vacía (selects y búsqueda) o como `null`
 * (extremos de los rangos de fecha), y el backend sólo entiende una forma: que el parámetro
 * no viaje. Los dos almacenes son ids numéricos aunque el `<select>` los entregue en cadena.
 * Origen y destino se filtran por separado — no se asume que uno implique al otro.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type TransferFiltrosUI = {
    q: string;
    status: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    requestDateDesde: string | null;
    requestDateHasta: string | null;
    sentDateDesde: string | null;
    sentDateHasta: string | null;
    receivedDateDesde: string | null;
    receivedDateHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type TransferFiltrosQuery = {
    q?: string;
    status?: string;
    sourceWarehouseId?: number;
    destinationWarehouseId?: number;
    requestDateDesde?: string;
    requestDateHasta?: string;
    sentDateDesde?: string;
    sentDateHasta?: string;
    receivedDateDesde?: string;
    receivedDateHasta?: string;
};

export function transferFiltrosParams(f: TransferFiltrosUI): TransferFiltrosQuery {
    return {
        q: f.q || undefined,
        status: f.status || undefined,
        sourceWarehouseId: f.sourceWarehouseId ? Number(f.sourceWarehouseId) : undefined,
        destinationWarehouseId: f.destinationWarehouseId ? Number(f.destinationWarehouseId) : undefined,
        requestDateDesde: f.requestDateDesde || undefined,
        requestDateHasta: f.requestDateHasta || undefined,
        sentDateDesde: f.sentDateDesde || undefined,
        sentDateHasta: f.sentDateHasta || undefined,
        receivedDateDesde: f.receivedDateDesde || undefined,
        receivedDateHasta: f.receivedDateHasta || undefined
    };
}
