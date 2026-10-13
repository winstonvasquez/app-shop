import { describe, expect, it } from 'vitest';
import { TransferFormValue, transferCrearPayload } from './transfer-management.form';

const BASE: TransferFormValue = {
    sourceWarehouseId: 1, destinationWarehouseId: 2,
    requestDate: '2026-04-01', notes: '', details: []
};

describe('transferCrearPayload', () => {
    it('con todo relleno arma el payload completo', () => {
        expect(transferCrearPayload({
            sourceWarehouseId: 1, destinationWarehouseId: 2,
            requestDate: '2026-04-01', notes: 'reposición',
            details: [{ productId: 5, requestedQuantity: 3, notes: 'urgente' }]
        })).toEqual({
            sourceWarehouseId: 1, destinationWarehouseId: 2,
            requestDate: '2026-04-01', notes: 'reposición',
            details: [{ productId: 5, requestedQuantity: 3, notes: 'urgente' }]
        });
    });

    it('las notas en blanco NO viajan, ni en cabecera ni en línea', () => {
        const p = transferCrearPayload({
            ...BASE, notes: '',
            details: [{ productId: 5, requestedQuantity: 3, notes: '' }]
        });
        expect(p.notes).toBeUndefined();
        expect(p.details[0].notes).toBeUndefined();
    });

    it('los ids del <select> se normalizan a número', () => {
        const p = transferCrearPayload({
            ...BASE, sourceWarehouseId: '8', destinationWarehouseId: '9',
            details: [{ productId: '12', requestedQuantity: '4', notes: '' }]
        });
        expect(p.sourceWarehouseId).toBe(8);
        expect(p.destinationWarehouseId).toBe(9);
        expect(p.details[0].productId).toBe(12);
        expect(p.details[0].requestedQuantity).toBe(4);
    });

    it('la fecha de solicitud viaja tal cual (obligatoria, no se normaliza)', () => {
        expect(transferCrearPayload({ ...BASE, requestDate: '2026-12-31' }).requestDate).toBe('2026-12-31');
    });

    it('sin líneas devuelve details vacío, no undefined', () => {
        expect(transferCrearPayload(BASE).details).toEqual([]);
    });

    it('conserva el orden y la cantidad de líneas', () => {
        const p = transferCrearPayload({
            ...BASE,
            details: [
                { productId: 1, requestedQuantity: 1, notes: 'a' },
                { productId: 2, requestedQuantity: 2, notes: '' },
                { productId: 3, requestedQuantity: 3, notes: 'c' }
            ]
        });
        expect(p.details.map((d) => d.productId)).toEqual([1, 2, 3]);
        expect(p.details[1].notes).toBeUndefined();
    });
});
