import { describe, expect, it } from 'vitest';
import { itemsDeOrdenRetenida } from './pos-page.orden-retenida';

const variante = { varianteId: 1, sku: 'S', nombre: 'N', nombreProducto: 'N', categoriaId: '1', categoria: 'C',
    precioBase: 10, precioAjuste: 0, precioFinal: 10, stockActual: 5, stockMinimo: 1 };

describe('itemsDeOrdenRetenida', () => {
    it('conserva descuento de línea, autorizador y bolsas', () => {
        const linea = { variante, cantidad: 2, subtotal: 18, descuentoTipo: 'PORCENTAJE', descuentoValor: 10,
            descuentoMonto: 2, autorizadoPor: 7, bolsas: 3 };
        expect(itemsDeOrdenRetenida(JSON.stringify([linea]))).toEqual([linea]);
    });

    it('rellena con valores neutros un payload antiguo sin esos campos', () => {
        const [i] = itemsDeOrdenRetenida(JSON.stringify([{ variante, cantidad: 3 }]))!;
        expect(i).toMatchObject({ subtotal: 30, descuentoTipo: 'NINGUNO', descuentoValor: 0, autorizadoPor: null, bolsas: 0 });
    });

    it('devuelve null si no es una lista de líneas', () => {
        expect(itemsDeOrdenRetenida('no es json')).toBeNull();
        expect(itemsDeOrdenRetenida('{"a":1}')).toBeNull();
        expect(itemsDeOrdenRetenida('[{"cantidad":1}]')).toBeNull();
    });
});
