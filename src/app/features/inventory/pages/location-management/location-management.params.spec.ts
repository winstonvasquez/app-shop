import { describe, expect, it } from 'vitest';
import { UbicacionesFiltrosUI, ubicacionesFiltrosParams } from './location-management.params';

const VACIO: UbicacionesFiltrosUI = {
    q: '', warehouseId: null, locationType: '', active: null,
    createdAtDesde: null, createdAtHasta: null
};

describe('ubicacionesFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(ubicacionesFiltrosParams({
            q: 'A-01', warehouseId: 3, locationType: 'PICKING', active: true,
            createdAtDesde: '2026-01-01', createdAtHasta: '2026-01-31'
        })).toEqual({
            q: 'A-01', warehouseId: 3, locationType: 'PICKING', active: true,
            createdAtDesde: '2026-01-01', createdAtHasta: '2026-01-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined (listado global)', () => {
        const r = ubicacionesFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.warehouseId).toBeUndefined();
        expect(r.locationType).toBeUndefined();
        expect(r.active).toBeUndefined();
        expect(r.createdAtDesde).toBeUndefined();
        expect(r.createdAtHasta).toBeUndefined();
    });

    it('active distingue "inactivo" de "sin filtrar"', () => {
        expect(ubicacionesFiltrosParams({ ...VACIO, active: false }).active).toBe(false);
        expect(ubicacionesFiltrosParams({ ...VACIO, active: true }).active).toBe(true);
        expect(ubicacionesFiltrosParams({ ...VACIO, active: null }).active).toBeUndefined();
    });

    it('almacén 0 es un id legítimo y NO se descarta', () => {
        expect(ubicacionesFiltrosParams({ ...VACIO, warehouseId: 0 }).warehouseId).toBe(0);
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = ubicacionesFiltrosParams({ ...VACIO, createdAtDesde: '', createdAtHasta: '' });
        expect(r.createdAtDesde).toBeUndefined();
        expect(r.createdAtHasta).toBeUndefined();
    });

    it('el rango de alta admite un solo extremo', () => {
        const r = ubicacionesFiltrosParams({ ...VACIO, createdAtDesde: '2026-02-01' });
        expect(r.createdAtDesde).toBe('2026-02-01');
        expect(r.createdAtHasta).toBeUndefined();
    });

    it('el tipo de ubicación vacío no viaja', () => {
        expect(ubicacionesFiltrosParams({ ...VACIO, locationType: '' }).locationType).toBeUndefined();
        expect(ubicacionesFiltrosParams({ ...VACIO, locationType: 'RACK' }).locationType).toBe('RACK');
    });
});
