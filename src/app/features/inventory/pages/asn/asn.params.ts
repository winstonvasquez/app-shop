/**
 * Traducción de los filtros del toolbar de ASN a los parámetros de consulta del backend.
 *
 * REGLA DE NEGOCIO: «filtro no elegido» se representa en la UI de tres formas distintas
 * (cadena vacía en los selects, `null` en los rangos de fecha) y el backend espera UNA sola:
 * que el parámetro no viaje. Todo lo que el usuario no eligió sale como `undefined`, que es
 * lo que `toHttpParams` omite de la query.
 *
 * El `warehouseId` viaja como número porque el contrato de `getAsnList` lo declara `number`;
 * en la UI es la cadena que devuelve el `<select>`.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type AsnFiltrosUI = {
    q: string;
    status: string;
    warehouseId: string;
    supplierName: string;
    expectedDesde: string | null;
    expectedHasta: string | null;
    receivedDesde: string | null;
    receivedHasta: string | null;
    createdDesde: string | null;
    createdHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type AsnFiltrosQuery = {
    q?: string;
    status?: string;
    warehouseId?: number;
    supplierName?: string;
    expectedDesde?: string;
    expectedHasta?: string;
    receivedDesde?: string;
    receivedHasta?: string;
    createdDesde?: string;
    createdHasta?: string;
};

export function asnFiltrosParams(f: AsnFiltrosUI): AsnFiltrosQuery {
    return {
        q: f.q || undefined,
        status: f.status || undefined,
        warehouseId: f.warehouseId ? Number(f.warehouseId) : undefined,
        supplierName: f.supplierName || undefined,
        expectedDesde: f.expectedDesde || undefined,
        expectedHasta: f.expectedHasta || undefined,
        receivedDesde: f.receivedDesde || undefined,
        receivedHasta: f.receivedHasta || undefined,
        createdDesde: f.createdDesde || undefined,
        createdHasta: f.createdHasta || undefined
    };
}
