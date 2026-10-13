import { describe, expect, it } from 'vitest';
import {
    FiltrosDevolucionCrudos,
    construirFiltrosDevolucion,
    hayFiltrosDevolucionActivos,
} from './pos-devoluciones.filtros';

const VACIOS: FiltrosDevolucionCrudos = {
    search: '',
    motivo: '',
    estado: '',
    cajeroId: '',
    fechaDevDesde: '',
    fechaDevHasta: '',
    fechaVentaDesde: '',
    fechaVentaHasta: '',
};

describe('construirFiltrosDevolucion', () => {
    it('sin nada elegido no envía ni un filtro (todos undefined, ninguno en cadena vacía)', () => {
        const filtros = construirFiltrosDevolucion(VACIOS);
        expect(filtros).toEqual({
            search: undefined,
            motivo: undefined,
            estado: undefined,
            cajeroId: undefined,
            fechaDevolucionDesde: undefined,
            fechaDevolucionHasta: undefined,
            fechaCreacionDesde: undefined,
            fechaCreacionHasta: undefined,
        });
        // Ningún valor puede ser '' — eso filtraría por cadena vacía y vaciaría el listado.
        expect(Object.values(filtros).some(v => v === '')).toBe(false);
    });

    it('con todo relleno mapea cada control a su parámetro del backend', () => {
        expect(construirFiltrosDevolucion({
            search: 'TICK-001',
            motivo: 'DEFECTUOSO',
            estado: 'PROCESADA',
            cajeroId: '12',
            fechaDevDesde: '2026-01-01',
            fechaDevHasta: '2026-01-31',
            fechaVentaDesde: '2025-12-01',
            fechaVentaHasta: '2025-12-31',
        })).toEqual({
            search: 'TICK-001',
            motivo: 'DEFECTUOSO',
            estado: 'PROCESADA',
            cajeroId: 12,
            fechaDevolucionDesde: '2026-01-01',
            fechaDevolucionHasta: '2026-01-31',
            fechaCreacionDesde: '2025-12-01',
            fechaCreacionHasta: '2025-12-31',
        });
    });

    it('el id de cajero viaja como número, no como cadena', () => {
        const { cajeroId } = construirFiltrosDevolucion({ ...VACIOS, cajeroId: '7' });
        expect(cajeroId).toBe(7);
        expect(typeof cajeroId).toBe('number');
    });

    it('no confunde las dos parejas de fechas (devolución vs venta)', () => {
        const filtros = construirFiltrosDevolucion({ ...VACIOS, fechaDevDesde: '2026-02-01', fechaVentaHasta: '2026-03-09' });
        expect(filtros.fechaDevolucionDesde).toBe('2026-02-01');
        expect(filtros.fechaDevolucionHasta).toBeUndefined();
        expect(filtros.fechaCreacionDesde).toBeUndefined();
        expect(filtros.fechaCreacionHasta).toBe('2026-03-09');
    });
});

describe('hayFiltrosDevolucionActivos', () => {
    it('sin filtros elegidos es false', () => {
        expect(hayFiltrosDevolucionActivos(VACIOS)).toBe(false);
    });

    it.each([
        ['search', { search: 'TICK' }],
        ['motivo', { motivo: 'DEFECTUOSO' }],
        ['estado', { estado: 'PROCESADA' }],
        ['cajeroId', { cajeroId: '3' }],
        ['fechaDevDesde', { fechaDevDesde: '2026-01-01' }],
        ['fechaDevHasta', { fechaDevHasta: '2026-01-31' }],
        ['fechaVentaDesde', { fechaVentaDesde: '2025-12-01' }],
        ['fechaVentaHasta', { fechaVentaHasta: '2025-12-31' }],
    ] as [string, Partial<FiltrosDevolucionCrudos>][])('basta con %s para que sea true', (_campo, parcial) => {
        expect(hayFiltrosDevolucionActivos({ ...VACIOS, ...parcial })).toBe(true);
    });

    it('el cajero con id "0" cuenta como filtro activo', () => {
        // '0' es una cadena no vacía: el usuario SÍ eligió algo, aunque el número sea 0.
        expect(hayFiltrosDevolucionActivos({ ...VACIOS, cajeroId: '0' })).toBe(true);
    });
});
