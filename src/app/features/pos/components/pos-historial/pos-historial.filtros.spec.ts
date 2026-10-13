import { describe, expect, it } from 'vitest';
import {
    FiltrosHistorialCrudos,
    construirFiltroHistorial,
    hayFiltrosHistorialActivos,
} from './pos-historial.filtros';

const VACIOS: FiltrosHistorialCrudos = {
    search: '',
    estado: '',
    metodoPago: '',
    tipoCpe: '',
    moneda: '',
    sucursalId: '',
    fechaDesde: '',
    fechaHasta: '',
};

describe('construirFiltroHistorial', () => {
    it('sin nada elegido no envía ni un filtro', () => {
        const filtro = construirFiltroHistorial(VACIOS);
        expect(filtro).toEqual({
            search: undefined,
            estado: undefined,
            metodoPago: undefined,
            tipoCpe: undefined,
            moneda: undefined,
            sucursalId: undefined,
            fechaCreacionDesde: undefined,
            fechaCreacionHasta: undefined,
        });
        // Ni un solo '' — filtrar por cadena vacía devolvería cero ventas.
        expect(Object.values(filtro).some(v => v === '')).toBe(false);
    });

    it('con todo relleno mapea cada control a su parámetro del backend', () => {
        expect(construirFiltroHistorial({
            search: 'TICK-9',
            estado: 'COMPLETADA',
            metodoPago: 'YAPE',
            tipoCpe: 'BOLETA',
            moneda: 'PEN',
            sucursalId: '4',
            fechaDesde: '2026-05-01',
            fechaHasta: '2026-05-31',
        })).toEqual({
            search: 'TICK-9',
            estado: 'COMPLETADA',
            metodoPago: 'YAPE',
            tipoCpe: 'BOLETA',
            moneda: 'PEN',
            sucursalId: 4,
            fechaCreacionDesde: '2026-05-01',
            fechaCreacionHasta: '2026-05-31',
        });
    });

    it('la sucursal viaja como número, no como cadena', () => {
        const { sucursalId } = construirFiltroHistorial({ ...VACIOS, sucursalId: '4' });
        expect(sucursalId).toBe(4);
        expect(typeof sucursalId).toBe('number');
    });

    it('renombra las fechas a fechaCreacionDesde/Hasta sin cruzarlas', () => {
        const filtro = construirFiltroHistorial({ ...VACIOS, fechaDesde: '2026-05-01' });
        expect(filtro.fechaCreacionDesde).toBe('2026-05-01');
        expect(filtro.fechaCreacionHasta).toBeUndefined();
    });
});

describe('hayFiltrosHistorialActivos', () => {
    it('sin filtros elegidos es false', () => {
        expect(hayFiltrosHistorialActivos(VACIOS)).toBe(false);
    });

    it.each([
        ['search', { search: 'TICK' }],
        ['estado', { estado: 'ANULADA' }],
        ['metodoPago', { metodoPago: 'PLIN' }],
        ['tipoCpe', { tipoCpe: 'FACTURA' }],
        ['moneda', { moneda: 'USD' }],
        ['sucursalId', { sucursalId: '2' }],
        ['fechaDesde', { fechaDesde: '2026-05-01' }],
        ['fechaHasta', { fechaHasta: '2026-05-31' }],
    ] as [string, Partial<FiltrosHistorialCrudos>][])('basta con %s para que sea true', (_campo, parcial) => {
        expect(hayFiltrosHistorialActivos({ ...VACIOS, ...parcial })).toBe(true);
    });

    it('la sucursal con id "0" cuenta como filtro activo', () => {
        expect(hayFiltrosHistorialActivos({ ...VACIOS, sucursalId: '0' })).toBe(true);
    });
});
