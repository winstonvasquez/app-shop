/**
 * Traducción de los filtros del toolbar de almacenes a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: `active` e `isPrincipal` son booleanos de TRES estados (sí / no / sin
 * filtrar). `false` es un filtro legítimo —«mostrame los almacenes NO principales»— y sólo
 * `null` significa «no filtrar»; por eso `??` y no `||`. La `city` no se ofrece como filtro:
 * no hay endpoint de valores distintos, así que viaja siempre sin definir.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type AlmacenesFiltrosUI = {
    search: string;
    active: boolean | null;
    isPrincipal: boolean | null;
    createdAtDesde: string | null;
    createdAtHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type AlmacenesFiltrosQuery = {
    search?: string;
    active?: boolean;
    isPrincipal?: boolean;
    createdAtDesde?: string;
    createdAtHasta?: string;
};

export function almacenesFiltrosParams(f: AlmacenesFiltrosUI): AlmacenesFiltrosQuery {
    return {
        search: f.search || undefined,
        active: f.active ?? undefined,
        isPrincipal: f.isPrincipal ?? undefined,
        createdAtDesde: f.createdAtDesde || undefined,
        createdAtHasta: f.createdAtHasta || undefined
    };
}
