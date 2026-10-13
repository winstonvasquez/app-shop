import { productIdToUuid } from '../../utils/synthetic-uuid.util';

/**
 * Traducción de los filtros del toolbar de lotes a los parámetros de consulta.
 *
 * REGLA DE NEGOCIO: el producto se elige con el buscador (no con un `<select>`) y viaja como
 * el UUID sintético que usa logística, no como el id numérico del catálogo de ventas — ver
 * `productIdToUuid`. `activo` es un booleano de TRES estados (activo / inactivo / sin filtrar),
 * así que `false` debe viajar y sólo `null` significa «no filtrar»; por eso `??` y no `||`.
 */

/** Filtros tal como los guarda el componente (lo que devuelven sus signals). */
export type LotesFiltrosUI = {
    q: string;
    /** id numérico del catálogo; `null` = sin filtro de producto */
    productId: number | null;
    activo: boolean | null;
    proveedorNombre: string;
    estadoVencimiento: string;
    vencimientoDesde: string | null;
    vencimientoHasta: string | null;
    fabricacionDesde: string | null;
    fabricacionHasta: string | null;
};

/** Parámetros de consulta ya normalizados (lo que espera el backend). */
export type LotesFiltrosQuery = {
    q?: string;
    productoId?: string;
    activo?: boolean;
    proveedorNombre?: string;
    estadoVencimiento?: string;
    vencimientoDesde?: string;
    vencimientoHasta?: string;
    fabricacionDesde?: string;
    fabricacionHasta?: string;
};

export function lotesFiltrosParams(f: LotesFiltrosUI): LotesFiltrosQuery {
    return {
        productoId: f.productId != null ? productIdToUuid(f.productId) : undefined,
        activo: f.activo ?? undefined,
        proveedorNombre: f.proveedorNombre || undefined,
        estadoVencimiento: f.estadoVencimiento || undefined,
        vencimientoDesde: f.vencimientoDesde || undefined,
        vencimientoHasta: f.vencimientoHasta || undefined,
        fabricacionDesde: f.fabricacionDesde || undefined,
        fabricacionHasta: f.fabricacionHasta || undefined,
        q: f.q || undefined
    };
}
