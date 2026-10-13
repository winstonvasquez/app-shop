/**
 * Traducción de los filtros del toolbar de reglas de reposición a parámetros de consulta.
 *
 * REGLA DE NEGOCIO: el modo de reposición es un booleano de TRES estados en la UI —
 * «Automática» (true), «Manual» (false) y «sin filtrar» (cadena vacía)—. Por eso NO se
 * puede resolver con `|| undefined`: `false` es un filtro legítimo que debe viajar, y sólo
 * la cadena vacía significa «no filtrar». El resto de filtros son texto: en blanco no viajan.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type ReglasFiltrosUI = {
    q: string;
    status: string;
    almacenId: string;
    /** '' = sin filtrar · 'true' = automática · 'false' = manual */
    autoCreatePo: string;
    lastTriggeredAtDesde: string | null;
    lastTriggeredAtHasta: string | null;
    lastPoCreatedAtDesde: string | null;
    lastPoCreatedAtHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type ReglasFiltrosQuery = {
    q?: string;
    status?: string;
    almacenId?: string;
    autoCreatePo?: boolean;
    lastTriggeredAtDesde?: string;
    lastTriggeredAtHasta?: string;
    lastPoCreatedAtDesde?: string;
    lastPoCreatedAtHasta?: string;
};

export function reglasFiltrosParams(f: ReglasFiltrosUI): ReglasFiltrosQuery {
    return {
        q: f.q || undefined,
        status: f.status || undefined,
        almacenId: f.almacenId || undefined,
        autoCreatePo: f.autoCreatePo === '' ? undefined : f.autoCreatePo === 'true',
        lastTriggeredAtDesde: f.lastTriggeredAtDesde || undefined,
        lastTriggeredAtHasta: f.lastTriggeredAtHasta || undefined,
        lastPoCreatedAtDesde: f.lastPoCreatedAtDesde || undefined,
        lastPoCreatedAtHasta: f.lastPoCreatedAtHasta || undefined
    };
}
