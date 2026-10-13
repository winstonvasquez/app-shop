import { describe, expect, it } from 'vitest';
import { MovimientosFiltrosUI, movimientosFiltrosParams } from './movement-management.params';

const VACIO: MovimientosFiltrosUI = {
    q: '', warehouseId: undefined, movementType: '', referenceType: '',
    locationId: undefined, productId: undefined,
    movementDateDesde: undefined, movementDateHasta: undefined
};

describe('movimientosFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(movimientosFiltrosParams({
            q: 'MOV-1', warehouseId: 3, movementType: 'ENTRADA_COMPRA', referenceType: 'OC',
            locationId: 8, productId: 12,
            movementDateDesde: '2026-01-01', movementDateHasta: '2026-01-31'
        })).toEqual({
            q: 'MOV-1', warehouseId: 3, movementType: 'ENTRADA_COMPRA', referenceType: 'OC',
            locationId: 8, productId: 12,
            movementDateDesde: '2026-01-01', movementDateHasta: '2026-01-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = movimientosFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.warehouseId).toBeUndefined();
        expect(r.movementType).toBeUndefined();
        expect(r.referenceType).toBeUndefined();
        expect(r.locationId).toBeUndefined();
        expect(r.productId).toBeUndefined();
        expect(r.movementDateDesde).toBeUndefined();
        expect(r.movementDateHasta).toBeUndefined();
    });

    it('los filtros de texto vacíos no viajan', () => {
        const r = movimientosFiltrosParams({ ...VACIO, movementType: '', referenceType: '', q: '' });
        expect(r.movementType).toBeUndefined();
        expect(r.referenceType).toBeUndefined();
        expect(r.q).toBeUndefined();
    });

    it('los ids numéricos pasan sin transformar, incluido el 0', () => {
        const r = movimientosFiltrosParams({ ...VACIO, warehouseId: 0, locationId: 0, productId: 0 });
        expect(r.warehouseId).toBe(0);
        expect(r.locationId).toBe(0);
        expect(r.productId).toBe(0);
    });

    it('ubicación y producto son independientes del almacén', () => {
        const r = movimientosFiltrosParams({ ...VACIO, productId: 5 });
        expect(r.productId).toBe(5);
        expect(r.warehouseId).toBeUndefined();
        expect(r.locationId).toBeUndefined();
    });

    it('el rango de fecha admite un solo extremo', () => {
        const r = movimientosFiltrosParams({ ...VACIO, movementDateDesde: '2026-05-01' });
        expect(r.movementDateDesde).toBe('2026-05-01');
        expect(r.movementDateHasta).toBeUndefined();
    });
});
