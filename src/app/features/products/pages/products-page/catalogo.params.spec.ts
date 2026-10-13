import { describe, expect, it, vi } from 'vitest';
import {
    AccionesDeFiltro,
    EstadoDeFiltros,
    EstadoDelCatalogo,
    construirConsultaCatalogo,
    describirFiltrosActivos,
} from './catalogo.params';

/** Pantalla recién abierta: ningún filtro tocado. */
const LIMPIO: EstadoDelCatalogo = {
    categoriaId: null,
    busqueda: '',
    marcas: [],
    precioMin: null,
    precioMax: null,
    orden: null,
    calificacionMinima: null,
    soloNuevos: false,
};

describe('construirConsultaCatalogo', () => {
    it('con todo puesto usa el endpoint filtrado y traslada cada filtro', () => {
        expect(construirConsultaCatalogo({
            categoriaId: 12,
            busqueda: 'polo',
            marcas: ['Nike', 'Adidas'],
            precioMin: 50,
            precioMax: 300,
            orden: 'price-asc',
            calificacionMinima: 4,
            soloNuevos: true,
        })).toEqual({
            usarFiltrado: true,
            sort: { field: 'precioBase', direction: 'asc' },
            filter: {
                search: 'polo',
                categoriaId: 12,
                marcas: ['Nike', 'Adidas'],
                precioMin: 50,
                precioMax: 300,
                minRating: 4,
            },
        });
    });

    it('sin nada elegido va al listado cacheado y no manda ningún parámetro vacío', () => {
        const c = construirConsultaCatalogo(LIMPIO);
        expect(c.usarFiltrado).toBe(false);
        expect(c.sort).toBeUndefined();
        expect(c.filter.marcas).toEqual([]);
        expect(c.filter.search).toBeUndefined();
        expect(c.filter.categoriaId).toBeUndefined();
        expect(c.filter.precioMin).toBeUndefined();
        expect(c.filter.precioMax).toBeUndefined();
        expect(c.filter.minRating).toBeUndefined();
    });

    // ── orden ───────────────────────────────────────────────────────────────────────────────
    it('cada criterio del select apunta a su columna del backend', () => {
        const orden = (o: string) => construirConsultaCatalogo({ ...LIMPIO, orden: o }).sort;
        expect(orden('sales')).toEqual({ field: 'salesCount', direction: 'desc' });
        expect(orden('rating')).toEqual({ field: 'rating', direction: 'desc' });
        expect(orden('price-asc')).toEqual({ field: 'precioBase', direction: 'asc' });
        expect(orden('price-desc')).toEqual({ field: 'precioBase', direction: 'desc' });
    });

    it('«sólo novedades» ordena por fecha de creación cuando no hay otro criterio', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, soloNuevos: true });
        expect(c.sort).toEqual({ field: 'fechaCreacion', direction: 'desc' });
        expect(c.usarFiltrado).toBe(true);
    });

    it('el criterio elegido por el usuario manda sobre «sólo novedades»', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, orden: 'sales', soloNuevos: true });
        expect(c.sort).toEqual({ field: 'salesCount', direction: 'desc' });
    });

    it('un criterio desconocido no ordena, pero sí saca de la caché', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, orden: 'inventado' });
        expect(c.sort).toBeUndefined();
        expect(c.usarFiltrado).toBe(true);
    });

    it('un criterio con nombre del prototipo (?sort=constructor) tampoco ordena', () => {
        expect(construirConsultaCatalogo({ ...LIMPIO, orden: 'constructor' }).sort).toBeUndefined();
        expect(construirConsultaCatalogo({ ...LIMPIO, orden: 'toString' }).sort).toBeUndefined();
    });

    // ── cuándo se abandona la caché ─────────────────────────────────────────────────────────
    it('categoría y búsqueda por sí solas siguen sirviéndose de la caché', () => {
        expect(construirConsultaCatalogo({ ...LIMPIO, categoriaId: 3 }).usarFiltrado).toBe(false);
        expect(construirConsultaCatalogo({ ...LIMPIO, busqueda: 'polo' }).usarFiltrado).toBe(false);
        const f = construirConsultaCatalogo({ ...LIMPIO, categoriaId: 3, busqueda: 'polo' }).filter;
        expect(f.search).toBe('polo');
        expect(f.categoriaId).toBe(3);
        expect(f.minRating).toBeUndefined();
    });

    it('cada filtro avanzado por separado obliga a la consulta filtrada', () => {
        expect(construirConsultaCatalogo({ ...LIMPIO, marcas: ['Nike'] }).usarFiltrado).toBe(true);
        expect(construirConsultaCatalogo({ ...LIMPIO, precioMin: 50 }).usarFiltrado).toBe(true);
        expect(construirConsultaCatalogo({ ...LIMPIO, precioMax: 300 }).usarFiltrado).toBe(true);
        expect(construirConsultaCatalogo({ ...LIMPIO, calificacionMinima: 4 }).usarFiltrado).toBe(true);
        expect(construirConsultaCatalogo({ ...LIMPIO, soloNuevos: true }).usarFiltrado).toBe(true);
    });

    it('un precio 0 es un filtro puesto, no un filtro ausente', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, precioMin: 0 });
        expect(c.usarFiltrado).toBe(true);
        expect(c.filter.precioMin).toBe(0);
        expect(construirConsultaCatalogo({ ...LIMPIO, precioMax: 0 }).usarFiltrado).toBe(true);
    });

    it('una calificación 0 no saca de la caché (la UI sólo ofrece 3, 4 y 5)', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, calificacionMinima: 0 });
        expect(c.usarFiltrado).toBe(false);
        expect(c.filter.minRating).toBe(0);
    });

    it('el rango abierto por un extremo conserva sólo ese extremo', () => {
        const c = construirConsultaCatalogo({ ...LIMPIO, precioMin: 50 });
        expect(c.filter.precioMin).toBe(50);
        expect(c.filter.precioMax).toBeUndefined();
    });

    it('la lista de marcas viaja íntegra aunque esté vacía', () => {
        expect(construirConsultaCatalogo(LIMPIO).filter.marcas).toEqual([]);
        expect(construirConsultaCatalogo({ ...LIMPIO, marcas: ['Nike'] }).filter.marcas).toEqual(['Nike']);
    });
});

// ── chips ───────────────────────────────────────────────────────────────────────────────────

const CATEGORIAS = [{ id: 3, nombre: 'Calzado' }, { id: 8, nombre: 'Ropa' }];
const ENVIOS = [
    { key: 'free' as const, label: 'Envío gratis' },
    { key: 'fast' as const, label: 'Llega mañana' },
    { key: 'intl' as const, label: 'Internacional' },
];

const SIN_FILTROS: EstadoDeFiltros = {
    categoriaId: null,
    categorias: CATEGORIAS,
    marcas: [],
    precioMin: null,
    precioMax: null,
    envios: [],
    opcionesDeEnvio: ENVIOS,
    calificacionMinima: null,
};

function accionesEspia(): AccionesDeFiltro {
    return {
        quitarCategoria: vi.fn(),
        alternarMarca: vi.fn(),
        limpiarPrecio: vi.fn(),
        alternarEnvio: vi.fn(),
        limpiarCalificacion: vi.fn(),
    };
}

describe('describirFiltrosActivos', () => {
    it('sin filtros no pinta ningún chip', () => {
        expect(describirFiltrosActivos(SIN_FILTROS, accionesEspia())).toEqual([]);
    });

    it('pinta todos los chips en su orden: categoría, marcas, precio, envíos y calificación', () => {
        const chips = describirFiltrosActivos({
            ...SIN_FILTROS,
            categoriaId: 8,
            marcas: ['Nike', 'Adidas'],
            precioMin: 50,
            precioMax: 300,
            envios: ['fast', 'intl'],
            calificacionMinima: 4,
        }, accionesEspia());
        expect(chips.map((c) => c.key)).toEqual([
            'cat', 'marca-Nike', 'marca-Adidas', 'price', 'envio-fast', 'envio-intl', 'rating',
        ]);
        expect(chips.map((c) => c.label)).toEqual([
            'Ropa', 'Nike', 'Adidas', 'S/ 50–S/ 300', 'Llega mañana', 'Internacional', '4★ y más',
        ]);
    });

    it('una categoría que todavía no llegó del backend no genera chip', () => {
        expect(describirFiltrosActivos({ ...SIN_FILTROS, categoriaId: 99 }, accionesEspia())).toEqual([]);
    });

    it('un envío desconocido tampoco genera chip', () => {
        const estado = { ...SIN_FILTROS, envios: ['fast' as const], opcionesDeEnvio: [] };
        expect(describirFiltrosActivos(estado, accionesEspia())).toEqual([]);
    });

    it('el rango sin extremo inferior arranca en 0 y sin superior termina en ∞', () => {
        const soloMax = describirFiltrosActivos({ ...SIN_FILTROS, precioMax: 300 }, accionesEspia());
        expect(soloMax[0].label).toBe('S/ 0–S/ 300');
        const soloMin = describirFiltrosActivos({ ...SIN_FILTROS, precioMin: 50 }, accionesEspia());
        expect(soloMin[0].label).toBe('S/ 50–S/ ∞');
    });

    it('un rango de 0 a 0 sigue siendo un filtro puesto, no ausencia de filtro', () => {
        const chips = describirFiltrosActivos({ ...SIN_FILTROS, precioMin: 0, precioMax: 0 }, accionesEspia());
        expect(chips).toHaveLength(1);
        expect(chips[0].label).toBe('S/ 0–S/ 0');
    });

    it('la «x» de cada chip dispara su propia acción, con la marca o el envío que le toca', () => {
        const acciones = accionesEspia();
        const chips = describirFiltrosActivos({
            ...SIN_FILTROS,
            categoriaId: 3,
            marcas: ['Nike'],
            precioMin: 50,
            envios: ['free'],
            calificacionMinima: 5,
        }, acciones);
        for (const c of chips) c.clear();
        expect(acciones.quitarCategoria).toHaveBeenCalledOnce();
        expect(acciones.alternarMarca).toHaveBeenCalledWith('Nike');
        expect(acciones.limpiarPrecio).toHaveBeenCalledOnce();
        expect(acciones.alternarEnvio).toHaveBeenCalledWith('free');
        expect(acciones.limpiarCalificacion).toHaveBeenCalledOnce();
    });
});
