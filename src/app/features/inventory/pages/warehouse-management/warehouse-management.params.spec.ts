import { describe, expect, it } from 'vitest';
import { AlmacenesFiltrosUI, almacenesFiltrosParams } from './warehouse-management.params';

const VACIO: AlmacenesFiltrosUI = {
    search: '', active: null, isPrincipal: null,
    createdAtDesde: null, createdAtHasta: null
};

describe('almacenesFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(almacenesFiltrosParams({
            search: 'central', active: true, isPrincipal: true,
            createdAtDesde: '2026-01-01', createdAtHasta: '2026-01-31'
        })).toEqual({
            search: 'central', active: true, isPrincipal: true,
            createdAtDesde: '2026-01-01', createdAtHasta: '2026-01-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = almacenesFiltrosParams(VACIO);
        expect(r.search).toBeUndefined();
        expect(r.active).toBeUndefined();
        expect(r.isPrincipal).toBeUndefined();
        expect(r.createdAtDesde).toBeUndefined();
        expect(r.createdAtHasta).toBeUndefined();
    });

    it('active distingue "inactivo" de "sin filtrar"', () => {
        expect(almacenesFiltrosParams({ ...VACIO, active: false }).active).toBe(false);
        expect(almacenesFiltrosParams({ ...VACIO, active: true }).active).toBe(true);
        expect(almacenesFiltrosParams({ ...VACIO, active: null }).active).toBeUndefined();
    });

    it('isPrincipal false es el filtro "no principal", no una ausencia', () => {
        expect(almacenesFiltrosParams({ ...VACIO, isPrincipal: false }).isPrincipal).toBe(false);
        expect(almacenesFiltrosParams({ ...VACIO, isPrincipal: null }).isPrincipal).toBeUndefined();
    });

    it('los dos booleanos son independientes', () => {
        const r = almacenesFiltrosParams({ ...VACIO, active: true, isPrincipal: false });
        expect(r.active).toBe(true);
        expect(r.isPrincipal).toBe(false);
    });

    it('la búsqueda vacía no viaja', () => {
        expect(almacenesFiltrosParams({ ...VACIO, search: '' }).search).toBeUndefined();
        expect(almacenesFiltrosParams({ ...VACIO, search: 'lima' }).search).toBe('lima');
    });

    it('el rango de alta admite un solo extremo', () => {
        const r = almacenesFiltrosParams({ ...VACIO, createdAtHasta: '2026-03-01' });
        expect(r.createdAtDesde).toBeUndefined();
        expect(r.createdAtHasta).toBe('2026-03-01');
    });
});
