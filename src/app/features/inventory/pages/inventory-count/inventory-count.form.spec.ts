import { describe, expect, it } from 'vitest';
import { ConteoFormValue, conteoCrearPayload } from './inventory-count.form';

const BASE: ConteoFormValue = {
    warehouseId: 1, countDate: '2026-04-01', notes: '', details: []
};

describe('conteoCrearPayload', () => {
    it('con todo relleno arma el payload completo', () => {
        expect(conteoCrearPayload({
            warehouseId: 2, countDate: '2026-04-10', notes: 'conteo trimestral',
            details: [{ productId: 7, countedQuantity: 12, notes: 'caja abierta' }]
        })).toEqual({
            warehouseId: 2, countDate: '2026-04-10T00:00:00', notes: 'conteo trimestral',
            details: [{ productId: 7, countedQuantity: 12, notes: 'caja abierta' }]
        });
    });

    it('contar 0 es el resultado más importante y NO se pierde', () => {
        // Un `|| undefined` aquí convertiría un faltante total en «línea no contada».
        const p = conteoCrearPayload({
            ...BASE, details: [{ productId: 7, countedQuantity: 0, notes: '' }]
        });
        expect(p.details[0].countedQuantity).toBe(0);
    });

    it('las notas en blanco NO viajan, ni en cabecera ni en línea', () => {
        const p = conteoCrearPayload({
            ...BASE, details: [{ productId: 7, countedQuantity: 1, notes: '' }]
        });
        expect(p.notes).toBeUndefined();
        expect(p.details[0].notes).toBeUndefined();
    });

    it('los ids y cantidades del formulario se normalizan a número', () => {
        const p = conteoCrearPayload({
            ...BASE, warehouseId: '4',
            details: [{ productId: '9', countedQuantity: '3', notes: '' }]
        });
        expect(p.warehouseId).toBe(4);
        expect(p.details[0].productId).toBe(9);
        expect(p.details[0].countedQuantity).toBe(3);
    });

    it('fecha vacía no se convierte (el backend la rechaza o aplica su default)', () => {
        expect(conteoCrearPayload({ ...BASE, countDate: '' }).countDate).toBe('');
    });

    it('la fecha de conteo se convierte a LocalDateTime (yyyy-MM-dd a secas daba 400)', () => {
        expect(conteoCrearPayload({ ...BASE, countDate: '2026-12-31' }).countDate).toBe('2026-12-31T00:00:00');
    });

    it('sin líneas devuelve details vacío, no undefined', () => {
        expect(conteoCrearPayload(BASE).details).toEqual([]);
    });

    it('conserva el orden de las líneas', () => {
        const p = conteoCrearPayload({
            ...BASE,
            details: [
                { productId: 1, countedQuantity: 0, notes: '' },
                { productId: 2, countedQuantity: 5, notes: 'ok' }
            ]
        });
        expect(p.details.map((d) => d.productId)).toEqual([1, 2]);
        expect(p.details[0].countedQuantity).toBe(0);
    });
});
