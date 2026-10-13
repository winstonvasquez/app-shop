import { describe, expect, it } from 'vitest';
import { ConteosFiltrosUI, conteosFiltrosParams } from './inventory-count.params';

const VACIO: ConteosFiltrosUI = {
    q: '', status: '', warehouseId: '',
    countDateDesde: null, countDateHasta: null,
    adjustedDateDesde: null, adjustedDateHasta: null
};

describe('conteosFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(conteosFiltrosParams({
            q: 'CF-1', status: 'CERRADO', warehouseId: '2',
            countDateDesde: '2026-01-01', countDateHasta: '2026-01-31',
            adjustedDateDesde: '2026-02-01', adjustedDateHasta: '2026-02-28'
        })).toEqual({
            q: 'CF-1', status: 'CERRADO', warehouseId: 2,
            countDateDesde: '2026-01-01', countDateHasta: '2026-01-31',
            adjustedDateDesde: '2026-02-01', adjustedDateHasta: '2026-02-28'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = conteosFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.status).toBeUndefined();
        expect(r.warehouseId).toBeUndefined();
        expect(r.countDateDesde).toBeUndefined();
        expect(r.countDateHasta).toBeUndefined();
        expect(r.adjustedDateDesde).toBeUndefined();
        expect(r.adjustedDateHasta).toBeUndefined();
    });

    it('el almacén viaja como número, no como la cadena del <select>', () => {
        expect(conteosFiltrosParams({ ...VACIO, warehouseId: '15' }).warehouseId).toBe(15);
    });

    it('almacén "0" es un id legítimo y NO se descarta', () => {
        expect(conteosFiltrosParams({ ...VACIO, warehouseId: '0' }).warehouseId).toBe(0);
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = conteosFiltrosParams({ ...VACIO, countDateDesde: '', adjustedDateHasta: '' });
        expect(r.countDateDesde).toBeUndefined();
        expect(r.adjustedDateHasta).toBeUndefined();
    });

    it('conteo y ajuste son rangos independientes', () => {
        const r = conteosFiltrosParams({ ...VACIO, countDateDesde: '2026-03-01', adjustedDateHasta: '2026-04-01' });
        expect(r.countDateDesde).toBe('2026-03-01');
        expect(r.countDateHasta).toBeUndefined();
        expect(r.adjustedDateDesde).toBeUndefined();
        expect(r.adjustedDateHasta).toBe('2026-04-01');
    });
});
