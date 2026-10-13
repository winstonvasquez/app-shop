import type { ProductFilter } from '@core/services/product.service';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';

/** Filtros de envío del panel lateral. Son de UI: hoy ninguno viaja al backend. */
export type ClaveDeEnvio = 'free' | 'fast' | 'intl';

export interface OpcionDeEnvio {
    key: ClaveDeEnvio;
    label: string;
}

/** Estado del listado tal como lo guardan los signals de la pantalla. */
export interface EstadoDelCatalogo {
    categoriaId: number | null;
    busqueda: string;
    marcas: string[];
    precioMin: number | null;
    precioMax: number | null;
    /** Criterio del select de orden: `sales` | `rating` | `price-asc` | `price-desc` | null. */
    orden: string | null;
    calificacionMinima: number | null;
    soloNuevos: boolean;
}

export interface ConsultaDelCatalogo {
    /** `true` ⇒ endpoint filtrado; `false` ⇒ listado cacheado, que es el camino barato. */
    usarFiltrado: boolean;
    sort?: { field: string; direction: 'asc' | 'desc' };
    filter: ProductFilter;
}

/**
 * Traducción del select de orden a la columna real del backend. Un criterio desconocido no ordena.
 *
 * Es un `Map` y no un objeto literal a propósito: el criterio llega del query param `sort`, o sea
 * de la URL, y con un objeto un `?sort=constructor` devolvería una función en vez de `undefined`.
 */
const ORDENES = new Map<string, { field: string; direction: 'asc' | 'desc' }>([
    ['sales', { field: 'salesCount', direction: 'desc' }],
    ['rating', { field: 'rating', direction: 'desc' }],
    ['price-asc', { field: 'precioBase', direction: 'asc' }],
    ['price-desc', { field: 'precioBase', direction: 'desc' }],
]);

/**
 * Decide con qué endpoint y con qué parámetros se pide el catálogo.
 *
 * Reglas de negocio que codifica:
 * - **Sólo se abandona la caché si hay filtro avanzado.** Categoría y búsqueda por sí solas se
 *   sirven del listado cacheado; marcas, rango de precio, orden, calificación o «sólo novedades»
 *   obligan a la consulta filtrada. Ojo con los ceros: un precio 0 SÍ es un filtro puesto (por eso
 *   se compara contra `null`), pero una calificación 0 no lo es (nunca se ofrece en la UI).
 * - **«Novedades» es un orden, no un filtro:** ordena por fecha de creación y sólo cuando el
 *   usuario no eligió otro criterio, que siempre tiene prioridad.
 * - **Un valor vacío no viaja:** búsqueda en blanco, categoría o rango sin poner salen como
 *   `undefined` para que `toHttpParams` los omita, no como cadena vacía ni como null.
 */
export function construirConsultaCatalogo(e: EstadoDelCatalogo): ConsultaDelCatalogo {
    const porCriterio = ORDENES.get(e.orden ?? '');
    const sort = porCriterio
        ?? (e.soloNuevos ? { field: 'fechaCreacion', direction: 'desc' as const } : undefined);

    const usarFiltrado = !!(
        e.marcas.length || e.precioMin != null || e.precioMax != null ||
        e.orden || e.calificacionMinima || e.soloNuevos
    );

    return {
        usarFiltrado,
        sort,
        filter: {
            search: e.busqueda || undefined,
            categoriaId: e.categoriaId ?? undefined,
            marcas: e.marcas,
            precioMin: e.precioMin ?? undefined,
            precioMax: e.precioMax ?? undefined,
            minRating: e.calificacionMinima ?? undefined,
        },
    };
}

// ── chips de filtros activos ────────────────────────────────────────────────────────────────

export interface EstadoDeFiltros {
    categoriaId: number | null;
    categorias: readonly { id: number; nombre: string }[];
    marcas: readonly string[];
    precioMin: number | null;
    precioMax: number | null;
    envios: readonly ClaveDeEnvio[];
    opcionesDeEnvio: readonly OpcionDeEnvio[];
    calificacionMinima: number | null;
}

/** Qué hace la pantalla cuando el usuario pulsa la «x» de un chip. */
export interface AccionesDeFiltro {
    quitarCategoria(): void;
    alternarMarca(marca: string): void;
    limpiarPrecio(): void;
    alternarEnvio(envio: ClaveDeEnvio): void;
    limpiarCalificacion(): void;
}

export interface ChipDeFiltro {
    key: string;
    label: string;
    clear: () => void;
}

/**
 * Describe los filtros activos como chips retirables, en el orden en que se pintan sobre el grid.
 *
 * Reglas de negocio que codifica:
 * - **Sólo se anuncia lo que el usuario puede reconocer:** una categoría o un envío cuyo catálogo
 *   todavía no llegó no genera chip, porque un chip sin etiqueta legible no se sabe qué quita.
 * - **El rango de precio es UN chip aunque tenga dos extremos**, y el extremo sin poner se pinta
 *   como `0` o `∞` en vez de omitirse: el usuario tiene que ver hasta dónde llega el rango.
 * - Marcas y envíos generan un chip cada uno; su «x» es un alternar, no un limpiar, para que
 *   quitar una marca no borre las demás.
 */
export function describirFiltrosActivos(e: EstadoDeFiltros, acciones: AccionesDeFiltro): ChipDeFiltro[] {
    const chips: ChipDeFiltro[] = [];

    if (e.categoriaId !== null) {
        const c = e.categorias.find((x) => x.id === e.categoriaId);
        if (c) chips.push({ key: 'cat', label: c.nombre, clear: () => acciones.quitarCategoria() });
    }

    for (const m of e.marcas) {
        chips.push({ key: 'marca-' + m, label: m, clear: () => acciones.alternarMarca(m) });
    }

    if (e.precioMin !== null || e.precioMax !== null) {
        const s = CURRENCY_DISPLAY.SYMBOL_PEN;
        chips.push({
            key: 'price',
            label: `${s} ${e.precioMin ?? 0}–${s} ${e.precioMax ?? '∞'}`,
            clear: () => acciones.limpiarPrecio(),
        });
    }

    for (const envio of e.envios) {
        const opt = e.opcionesDeEnvio.find((s) => s.key === envio);
        if (opt) chips.push({ key: 'envio-' + envio, label: opt.label, clear: () => acciones.alternarEnvio(envio) });
    }

    if (e.calificacionMinima !== null) {
        chips.push({
            key: 'rating',
            label: `${e.calificacionMinima}★ y más`,
            clear: () => acciones.limpiarCalificacion(),
        });
    }

    return chips;
}
