import { describe, expect, it } from 'vitest';
import { consultaDeShowcase } from './showcase.util';

describe('consultaDeShowcase', () => {
    it('«más vendidos» ordena por ventas, sin filtro ni insignia de sección', () => {
        expect(consultaDeShowcase('best-sellers')).toEqual({
            sort: { field: 'salesCount', direction: 'desc' },
            filter: {},
        });
    });

    it('«mejor valorados» ordena por rating y descarta los de menos de 4 estrellas', () => {
        expect(consultaDeShowcase('top-rated')).toEqual({
            sort: { field: 'rating', direction: 'desc' },
            filter: { minRating: 4 },
        });
    });

    it('«recién llegados» ordena por fecha de alta e impone la insignia NUEVO', () => {
        expect(consultaDeShowcase('new-arrivals')).toEqual({
            sort: { field: 'fechaCreacion', direction: 'desc' },
            filter: {},
            badgeDeSeccion: 'NUEVO',
        });
    });

    it('sólo «recién llegados» trae insignia de sección', () => {
        expect(consultaDeShowcase('best-sellers').badgeDeSeccion).toBeUndefined();
        expect(consultaDeShowcase('top-rated').badgeDeSeccion).toBeUndefined();
    });

    it('los tres carruseles ordenan descendente', () => {
        for (const t of ['best-sellers', 'top-rated', 'new-arrivals'] as const) {
            expect(consultaDeShowcase(t).sort.direction).toBe('desc');
        }
    });
});
