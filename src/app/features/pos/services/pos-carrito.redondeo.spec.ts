import { describe, expect, it } from 'vitest';
import { redondeoDeCobro, redondeoEfectivo } from './pos-carrito.redondeo';

describe('redondeoEfectivo', () => {
    it('baja al múltiplo de S/0.10 inferior', () => {
        expect(redondeoEfectivo(10.07)).toBe(0.07);
        expect(redondeoEfectivo(10.99)).toBe(0.09);
        expect(redondeoEfectivo(10.1)).toBe(0);
    });
    it('no se contamina de coma flotante', () => {
        expect(redondeoEfectivo(0.3)).toBe(0);
        expect(redondeoEfectivo(1.15)).toBe(0.05);
    });
    it('importes nulos o negativos no redondean', () => {
        expect(redondeoEfectivo(0)).toBe(0);
        expect(redondeoEfectivo(-5.05)).toBe(0);
    });
});

describe('redondeoDeCobro', () => {
    it('efectivo simple redondea; otros medios no', () => {
        expect(redondeoDeCobro(false, 'EFECTIVO', [], 12.34)).toBe(0.04);
        expect(redondeoDeCobro(false, 'YAPE', [], 12.34)).toBe(0);
    });
    it('pago dividido: sólo la parte en efectivo', () => {
        const pagos = [{ metodo: 'EFECTIVO' as const, monto: 0 }, { metodo: 'YAPE' as const, monto: 5 }];
        expect(redondeoDeCobro(true, 'EFECTIVO', pagos, 12.34)).toBe(0.04); // efectivo = 7.34
        expect(redondeoDeCobro(true, 'EFECTIVO', [pagos[1], { metodo: 'TARJETA', monto: 7.34 }], 12.34)).toBe(0);
        // faltan 0.07 en efectivo: redondear lo dejaría en 0 y el servidor rechazaría → sin redondeo
        expect(redondeoDeCobro(true, 'EFECTIVO', [{ metodo: 'EFECTIVO', monto: 0 }, { metodo: 'TARJETA', monto: 50.40 }], 50.47)).toBe(0);
    });
});
