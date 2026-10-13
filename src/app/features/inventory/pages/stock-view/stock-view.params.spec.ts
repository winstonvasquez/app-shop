import { describe, expect, it } from 'vitest';
import { StockFiltrosUI, stockFiltrosParams } from './stock-view.params';

const VACIO: StockFiltrosUI = {
    warehouseId: undefined, estadoStock: '',
    updatedAtDesde: null, updatedAtHasta: null
};

describe('stockFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(stockFiltrosParams({
            warehouseId: 4, estadoStock: 'BAJO_MINIMO',
            updatedAtDesde: '2026-01-01', updatedAtHasta: '2026-01-31'
        })).toEqual({
            warehouseId: 4, estadoStock: 'BAJO_MINIMO',
            updatedAtDesde: '2026-01-01', updatedAtHasta: '2026-01-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = stockFiltrosParams(VACIO);
        expect(r.warehouseId).toBeUndefined();
        expect(r.estadoStock).toBeUndefined();
        expect(r.updatedAtDesde).toBeUndefined();
        expect(r.updatedAtHasta).toBeUndefined();
    });

    it('almacén 0 es un id legítimo y NO se descarta', () => {
        expect(stockFiltrosParams({ ...VACIO, warehouseId: 0 }).warehouseId).toBe(0);
    });

    it('el estado derivado vacío no viaja; los tres válidos sí', () => {
        expect(stockFiltrosParams({ ...VACIO, estadoStock: '' }).estadoStock).toBeUndefined();
        for (const estado of ['BAJO_MINIMO', 'REORDEN', 'NORMAL']) {
            expect(stockFiltrosParams({ ...VACIO, estadoStock: estado }).estadoStock).toBe(estado);
        }
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = stockFiltrosParams({ ...VACIO, updatedAtDesde: '', updatedAtHasta: '' });
        expect(r.updatedAtDesde).toBeUndefined();
        expect(r.updatedAtHasta).toBeUndefined();
    });

    it('el rango de actualización admite un solo extremo', () => {
        const r = stockFiltrosParams({ ...VACIO, updatedAtDesde: '2026-02-01' });
        expect(r.updatedAtDesde).toBe('2026-02-01');
        expect(r.updatedAtHasta).toBeUndefined();
    });
});
