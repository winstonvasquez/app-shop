import { describe, expect, it } from 'vitest';
import { AsnFormValue, asnCrearPayload, asnRecibirLineas } from './asn.form';

const FORM_VACIO: AsnFormValue = {
    supplierName: '', referenceDocument: '', warehouseId: 3, expectedDate: '', notes: ''
};

describe('asnCrearPayload', () => {
    it('con todo relleno arma el payload completo', () => {
        expect(asnCrearPayload(
            {
                supplierName: 'Acme', referenceDocument: 'OC-001',
                warehouseId: 5, expectedDate: '2026-04-01', notes: 'urgente'
            },
            [{ productId: 10, productName: 'Tornillo', expectedQuantity: 4, unitCost: 2.5 }]
        )).toEqual({
            supplierName: 'Acme', referenceDocument: 'OC-001',
            warehouseId: 5, expectedDate: '2026-04-01', notes: 'urgente',
            lines: [{ productId: 10, productName: 'Tornillo', expectedQuantity: 4, unitCost: 2.5 }]
        });
    });

    it('los opcionales en blanco NO viajan', () => {
        const p = asnCrearPayload(FORM_VACIO, []);
        expect(p.supplierName).toBeUndefined();
        expect(p.referenceDocument).toBeUndefined();
        expect(p.expectedDate).toBeUndefined();
        expect(p.notes).toBeUndefined();
        expect(p.lines).toEqual([]);
    });

    it('el almacén se manda como número aunque el select lo entregue en cadena', () => {
        expect(asnCrearPayload({ ...FORM_VACIO, warehouseId: '9' }, []).warehouseId).toBe(9);
    });

    it('la cantidad esperada se normaliza a número', () => {
        const p = asnCrearPayload(FORM_VACIO, [
            { productId: 1, productName: 'X', expectedQuantity: '7' as unknown as number }
        ]);
        expect(p.lines[0].expectedQuantity).toBe(7);
    });

    it('costo unitario 0 es válido y se conserva; ausente se omite', () => {
        const p = asnCrearPayload(FORM_VACIO, [
            { productId: 1, productName: 'Regalo', expectedQuantity: 1, unitCost: 0 },
            { productId: 2, productName: 'Sin costo', expectedQuantity: 1 }
        ]);
        expect(p.lines[0].unitCost).toBe(0);
        expect(p.lines[1].unitCost).toBeUndefined();
    });
});

describe('asnRecibirLineas', () => {
    it('sin cantidad tecleada se asume lo esperado', () => {
        expect(asnRecibirLineas([{ id: 1, expectedQuantity: 10 }], {}))
            .toEqual([{ lineId: 1, receivedQuantity: 10 }]);
    });

    it('la cantidad tecleada manda sobre lo esperado', () => {
        expect(asnRecibirLineas([{ id: 1, expectedQuantity: 10 }], { 1: 8 }))
            .toEqual([{ lineId: 1, receivedQuantity: 8 }]);
    });

    it('recibir 0 es una recepción legítima y NO se reemplaza por lo esperado', () => {
        // Con `||` en vez de `??` esto devolvería 10 y daría por recibida mercadería que no llegó.
        expect(asnRecibirLineas([{ id: 1, expectedQuantity: 10 }], { 1: 0 }))
            .toEqual([{ lineId: 1, receivedQuantity: 0 }]);
    });

    it('mezcla líneas tecleadas y no tecleadas', () => {
        expect(asnRecibirLineas(
            [{ id: 1, expectedQuantity: 10 }, { id: 2, expectedQuantity: 5 }],
            { 2: 4 }
        )).toEqual([
            { lineId: 1, receivedQuantity: 10 },
            { lineId: 2, receivedQuantity: 4 }
        ]);
    });
});
