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
            fechaDesde: '2026-05-01',
            fechaHasta: '2026-05-31',
        })).toEqual({
            search: 'TICK-9',
            estado: 'COMPLETADA',
            metodoPago: 'YAPE',
            tipoCpe: 'BOLETA',
            moneda: 'PEN',
            fechaCreacionDesde: '2026-05-01',
            fechaCreacionHasta: '2026-05-31',
        });
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
        ['fechaDesde', { fechaDesde: '2026-05-01' }],
        ['fechaHasta', { fechaHasta: '2026-05-31' }],
    ] as [string, Partial<FiltrosHistorialCrudos>][])('basta con %s para que sea true', (_campo, parcial) => {
        expect(hayFiltrosHistorialActivos({ ...VACIOS, ...parcial })).toBe(true);
    });
});
