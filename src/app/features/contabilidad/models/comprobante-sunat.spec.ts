import { describe, expect, it } from 'vitest';
import { codigoSunatDeComprobante } from './comprobante-sunat';

describe('codigoSunatDeComprobante', () => {
    it('traduce el código del catálogo al de SUNAT y deja pasar lo desconocido', () => {
        expect(codigoSunatDeComprobante('FACTURA')).toBe('01');
        expect(codigoSunatDeComprobante('NOTA_CREDITO')).toBe('07');
        expect(codigoSunatDeComprobante('')).toBe('');
        expect(codigoSunatDeComprobante('01')).toBe('01');
    });
});
