/**
 * Traducción de los filtros del toolbar de ubicaciones a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: el listado es GLOBAL — el almacén es un filtro opcional, no un requisito
 * para listar, así que sin almacén elegido el parámetro simplemente no viaja. `active` es un
 * booleano de TRES estados (activo / inactivo / sin filtrar): `false` es un filtro legítimo y
 * sólo `null` significa «no filtrar», de ahí `??` y no `||`.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type UbicacionesFiltrosUI = {
    q: string;
    warehouseId: number | null;
    locationType: string;
    active: boolean | null;
    createdAtDesde: string | null;
    createdAtHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type UbicacionesFiltrosQuery = {
    q?: string;
    warehouseId?: number;
    locationType?: string;
    active?: boolean;
    createdAtDesde?: string;
    createdAtHasta?: string;
};

export function ubicacionesFiltrosParams(f: UbicacionesFiltrosUI): UbicacionesFiltrosQuery {
    return {
        warehouseId: f.warehouseId ?? undefined,
        locationType: f.locationType || undefined,
        active: f.active ?? undefined,
        q: f.q || undefined,
        createdAtDesde: f.createdAtDesde || undefined,
        createdAtHasta: f.createdAtHasta || undefined
    };
}
