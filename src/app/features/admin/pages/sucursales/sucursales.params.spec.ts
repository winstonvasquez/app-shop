import { describe, expect, it } from 'vitest';
import { PATRON_SERIE_BOLETA, PATRON_SERIE_FACTURA } from './sucursales.params';

describe('series CPE de sucursal (POS-6)', () => {
    it('boleta: vacío o B###', () => {
        for (const ok of ['', 'B001', 'BA1Z']) expect(PATRON_SERIE_BOLETA.test(ok)).toBe(true);
        for (const mal of ['F001', 'B01', 'B0011', 'b001', 'X999']) expect(PATRON_SERIE_BOLETA.test(mal)).toBe(false);
    });

    it('factura: vacío o F###', () => {
        for (const ok of ['', 'F001', 'FA1Z']) expect(PATRON_SERIE_FACTURA.test(ok)).toBe(true);
        for (const mal of ['B001', 'F01', 'F0011', 'f001', 'Y999']) expect(PATRON_SERIE_FACTURA.test(mal)).toBe(false);
    });
});
