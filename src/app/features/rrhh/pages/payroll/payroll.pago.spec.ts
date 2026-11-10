import { describe, expect, it } from 'vitest';
import { enPagoTesoreria, etiquetaEstadoPlanilla, puedeSolicitarPago, vencimientoCts } from './payroll.pago';

describe('payroll.pago', () => {
    it('APROBADO sin pagoId se puede solicitar; con pagoId está en pago y no se re-ofrece', () => {
        expect(puedeSolicitarPago({ estado: 'APROBADO' })).toBe(true);
        expect(enPagoTesoreria({ estado: 'APROBADO' })).toBe(false);
        expect(puedeSolicitarPago({ estado: 'APROBADO', pagoId: 7 })).toBe(false);
        expect(enPagoTesoreria({ estado: 'APROBADO', pagoId: 7 })).toBe(true);
        expect(etiquetaEstadoPlanilla({ estado: 'APROBADO', pagoId: 7 })).toBe('Pago solicitado a tesorería');
    });

    it('PAGADO y GENERADO no son «en pago» aunque tengan pagoId', () => {
        expect(enPagoTesoreria({ estado: 'PAGADO', pagoId: 7 })).toBe(false);
        expect(etiquetaEstadoPlanilla({ estado: 'PAGADO', pagoId: 7 })).toBe('PAGADO');
        expect(puedeSolicitarPago({ estado: 'GENERADO' })).toBe(false);
    });

    it('vence la CTS el 15 de mayo y noviembre', () => {
        expect(vencimientoCts('2026-05')).toBe('15/05/2026');
        expect(vencimientoCts('2026-11')).toBe('15/11/2026');
        expect(vencimientoCts('2026-07')).toBeNull();
    });
});
