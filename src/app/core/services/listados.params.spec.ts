import { describe, expect, it } from 'vitest';
import { paramsDeCategorias, paramsDePaginacion, paramsDeProductos } from './listados.params';
import { toHttpParams } from '@core/utils/http-params.util';

const PAG = { page: 0, size: 20 };

describe('paramsDePaginacion', () => {
    it('sin orden elegido el `sort` queda undefined y no llega a viajar', () => {
        expect(paramsDePaginacion(PAG)).toEqual({ page: 0, size: 20, sort: undefined });
        expect(toHttpParams(paramsDePaginacion(PAG)).has('sort')).toBe(false);
    });

    it('con orden lo serializa como `campo,direccion`, que es lo que parsea Pageable', () => {
        expect(paramsDePaginacion({ page: 2, size: 50, sort: { field: 'nombre', direction: 'desc' } }))
            .toEqual({ page: 2, size: 50, sort: 'nombre,desc' });
    });

    it('la página 0 SÍ viaja: es la primera página, no «sin elegir»', () => {
        expect(toHttpParams(paramsDePaginacion(PAG)).get('page')).toBe('0');
    });
});

describe('paramsDeProductos', () => {
    it('con todos los filtros puestos los pasa con los nombres del backend', () => {
        expect(paramsDeProductos(
            { page: 1, size: 10, sort: { field: 'precioBase', direction: 'asc' } },
            {
                search: 'polo', companyId: 3, categoriaId: 7,
                precioMin: 10, precioMax: 200, marcas: ['Nike', 'Adidas'],
                minRating: 4, fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
                activo: true,
            },
        )).toEqual({
            page: 1, size: 10, sort: 'precioBase,asc',
            search: 'polo', companyId: 3, categoriaId: 7,
            precioMin: 10, precioMax: 200, marca: ['Nike', 'Adidas'],
            minRating: 4, fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
            activo: true,
        });
    });

    it('sin filtro alguno todos los campos quedan undefined, uno a uno', () => {
        const p = paramsDeProductos(PAG);
        for (const clave of ['search', 'companyId', 'categoriaId', 'precioMin', 'precioMax',
            'marca', 'minRating', 'fechaCreacionDesde', 'fechaCreacionHasta', 'activo']) {
            expect(p[clave], clave).toBeUndefined();
        }
        expect(p).toEqual({ ...p, page: 0, size: 20 });
    });

    it('un filtro vacío ({}) se comporta igual que no pasar filtro', () => {
        expect(paramsDeProductos(PAG, {})).toEqual(paramsDeProductos(PAG));
    });

    it('`activo: false` NO es «sin filtro»: viaja, porque significa «ver los inactivos»', () => {
        expect(paramsDeProductos(PAG, { activo: false })['activo']).toBe(false);
        expect(toHttpParams(paramsDeProductos(PAG, { activo: false })).get('activo')).toBe('false');
    });

    it('`precioMin: 0` es un mínimo legítimo y no se descarta', () => {
        expect(toHttpParams(paramsDeProductos(PAG, { precioMin: 0 })).get('precioMin')).toBe('0');
    });

    it('la marca viaja repetida y en singular (`?marca=A&marca=B`)', () => {
        const params = toHttpParams(paramsDeProductos(PAG, { marcas: ['Nike', 'Adidas'] }));
        expect(params.getAll('marca')).toEqual(['Nike', 'Adidas']);
        expect(params.has('marcas')).toBe(false);
    });

    it('un array de marcas vacío no produce ningún parámetro', () => {
        expect(toHttpParams(paramsDeProductos(PAG, { marcas: [] })).has('marca')).toBe(false);
    });

    it('una búsqueda vacía no viaja (la omite toHttpParams)', () => {
        expect(toHttpParams(paramsDeProductos(PAG, { search: '' })).has('search')).toBe(false);
    });
});

describe('paramsDeCategorias', () => {
    it('con todos los filtros puestos los pasa con los nombres del backend', () => {
        expect(paramsDeCategorias(
            { page: 0, size: 20, sort: { field: 'nombre', direction: 'asc' } },
            {
                search: 'ropa', nivel: 2, conImagen: true, activo: true, padreId: 5,
                fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
            },
        )).toEqual({
            page: 0, size: 20, sort: 'nombre,asc',
            search: 'ropa', nivel: 2, conImagen: true, activo: true, padreId: 5,
            fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
        });
    });

    it('sin filtro alguno todos los campos quedan undefined, uno a uno', () => {
        const p = paramsDeCategorias(PAG);
        for (const clave of ['search', 'nivel', 'conImagen', 'activo', 'padreId',
            'fechaCreacionDesde', 'fechaCreacionHasta']) {
            expect(p[clave], clave).toBeUndefined();
        }
    });

    it('`conImagen: false` y `activo: false` viajan: son elecciones del usuario', () => {
        const params = toHttpParams(paramsDeCategorias(PAG, { conImagen: false, activo: false }));
        expect(params.get('conImagen')).toBe('false');
        expect(params.get('activo')).toBe('false');
    });

    it('`nivel: 0` es un nivel legítimo (la raíz) y no se descarta', () => {
        expect(toHttpParams(paramsDeCategorias(PAG, { nivel: 0 })).get('nivel')).toBe('0');
    });
});
