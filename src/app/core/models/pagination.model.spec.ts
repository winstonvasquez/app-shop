import { describe, expect, it } from 'vitest';
import { adaptSpringPage, pageTotalElements, pageTotalPages } from './pagination.model';

describe('adaptSpringPage', () => {
    it('lee la forma plana de Spring', () => {
        const p = adaptSpringPage<number>(
            { content: [1, 2], totalElements: 2, totalPages: 1, size: 10, number: 0, first: true, last: true, empty: false },
            0, 10,
        );
        expect(p).toEqual({
            content: [1, 2], totalElements: 2, totalPages: 1, size: 10, number: 0,
            first: true, last: true, empty: false,
        });
    });

    it('lee la forma anidada de Boot 3 (`page: {…}`), incluidos size y number', () => {
        const p = adaptSpringPage<string>(
            { content: ['a'], page: { totalElements: 31, totalPages: 4, size: 8, number: 2 } },
            0, 10,
        );
        expect(p.totalElements).toBe(31);
        expect(p.totalPages).toBe(4);
        // El tamaño que MANDA es el que devolvió el backend, no el que se pidió.
        expect(p.size).toBe(8);
        expect(p.number).toBe(2);
    });

    it('sin metadatos cae a la página y el tamaño pedidos, nunca a NaN', () => {
        const p = adaptSpringPage<number>({ content: [] }, 3, 25);
        expect(p).toEqual({
            content: [], totalElements: 0, totalPages: 0, size: 25, number: 3,
            first: false, last: false, empty: false,
        });
    });

    it('una respuesta vacía, null o sin content no revienta ni deja content undefined', () => {
        expect(adaptSpringPage<number>(null, 0, 10).content).toEqual([]);
        expect(adaptSpringPage<number>({}, 0, 10).content).toEqual([]);
        expect(adaptSpringPage<number>({ content: null }, 0, 10).content).toEqual([]);
    });

    it('la forma plana gana a la anidada cuando llegan las dos', () => {
        const p = adaptSpringPage<number>({ totalElements: 7, page: { totalElements: 99 } }, 0, 10);
        expect(p.totalElements).toBe(7);
    });

    it('un totalElements de 0 explícito no se confunde con "no vino"', () => {
        expect(adaptSpringPage<number>({ totalElements: 0, page: { totalElements: 99 } }, 0, 10).totalElements).toBe(0);
    });
});

describe('pageTotalElements / pageTotalPages', () => {
    it('soportan las dos formas y caen a 0', () => {
        expect(pageTotalElements({ totalElements: 5 })).toBe(5);
        expect(pageTotalElements({ page: { totalElements: 5 } })).toBe(5);
        expect(pageTotalElements(null)).toBe(0);
        expect(pageTotalPages({ totalPages: 2 })).toBe(2);
        expect(pageTotalPages({ page: { totalPages: 2 } })).toBe(2);
        expect(pageTotalPages(undefined)).toBe(0);
    });
});
