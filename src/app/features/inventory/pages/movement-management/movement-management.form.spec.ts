import { describe, expect, it } from 'vitest';
import { MovimientoFormValue, movimientoCrearPayload } from './movement-management.form';

const BASE: MovimientoFormValue = {
    productId: 1, warehouseId: 2, movementType: 'ENTRADA_COMPRA',
    quantity: 10, unitCost: null, movementDate: '2026-04-01',
    reason: '', referenceType: '', referenceNumber: '', locationId: null
};

describe('movimientoCrearPayload', () => {
    it('con todo relleno arma el payload completo', () => {
        expect(movimientoCrearPayload({
            productId: 5, warehouseId: 3, movementType: 'SALIDA_VENTA',
            quantity: 4, unitCost: 12.5, movementDate: '2026-04-10',
            reason: 'venta mostrador', referenceType: 'VENTA', referenceNumber: 'B001-1',
            locationId: 9
        })).toEqual({
            productId: 5, warehouseId: 3, movementType: 'SALIDA_VENTA',
            quantity: 4, unitCost: 12.5, movementDate: '2026-04-10',
            reason: 'venta mostrador', referenceType: 'VENTA', referenceNumber: 'B001-1',
            locationId: 9
        });
    });

    it('los opcionales ausentes NO viajan', () => {
        const p = movimientoCrearPayload(BASE);
        expect(p.unitCost).toBeUndefined();
        expect(p.locationId).toBeUndefined();
        expect(p.reason).toBeUndefined();
        expect(p.referenceType).toBeUndefined();
        expect(p.referenceNumber).toBeUndefined();
    });

    it('costo unitario 0 es válido y se conserva', () => {
        // Consignación o muestra gratuita: `|| undefined` lo borraría y falsearía el costeo.
        expect(movimientoCrearPayload({ ...BASE, unitCost: 0 }).unitCost).toBe(0);
    });

    it('ubicación 0 es un id válido y se conserva', () => {
        expect(movimientoCrearPayload({ ...BASE, locationId: 0 }).locationId).toBe(0);
    });

    it('los ids y cantidades del formulario se normalizan a número', () => {
        const p = movimientoCrearPayload({
            ...BASE, productId: '7', warehouseId: '8', quantity: '3',
            unitCost: '2.5', locationId: '11'
        });
        expect(p.productId).toBe(7);
        expect(p.warehouseId).toBe(8);
        expect(p.quantity).toBe(3);
        expect(p.unitCost).toBe(2.5);
        expect(p.locationId).toBe(11);
    });

    it('el tipo y la fecha viajan tal cual (obligatorios)', () => {
        const p = movimientoCrearPayload({ ...BASE, movementType: 'ENTRADA_AJUSTE', movementDate: '2026-12-31' });
        expect(p.movementType).toBe('ENTRADA_AJUSTE');
        expect(p.movementDate).toBe('2026-12-31');
    });
});
