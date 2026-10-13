import { describe, expect, it } from 'vitest';
import { construirPaymentRequest, ValoresFormularioPago } from './pagos.form';

const completo: ValoresFormularioPago = {
    tipoPago: 'PROVEEDOR',
    monto: 1250.5,
    moneda: 'USD',
    metodoPago: 'TRANSFERENCIA',
    fechaSolicitud: '2026-08-06',
    beneficiarioNombre: 'Distribuidora Andina SAC',
    beneficiarioDocumento: '20123456789',
    concepto: 'Factura F001-000045',
    bankAccountId: 7,
};

/** Mínimo que sobrevive a `Validators.required`: sin documento ni cuenta bancaria. */
const minimo: ValoresFormularioPago = {
    tipoPago: 'OTRO',
    monto: 80,
    metodoPago: 'EFECTIVO',
    fechaSolicitud: '2026-08-06',
    beneficiarioNombre: 'Juan Pérez',
    concepto: 'Reembolso de caja chica',
};

describe('construirPaymentRequest', () => {
    it('con el formulario completo copia todo y añade el tenant del JWT', () => {
        expect(construirPaymentRequest(completo, 3)).toEqual({
            tenantId: 3,
            tipoPago: 'PROVEEDOR',
            monto: 1250.5,
            moneda: 'USD',
            metodoPago: 'TRANSFERENCIA',
            fechaSolicitud: '2026-08-06',
            beneficiarioNombre: 'Distribuidora Andina SAC',
            beneficiarioDocumento: '20123456789',
            concepto: 'Factura F001-000045',
            bankAccountId: 7,
        });
    });

    it('el tenant nunca sale del formulario, siempre del parámetro', () => {
        expect(construirPaymentRequest(completo, 99).tenantId).toBe(99);
    });

    it('sin moneda cae a PEN, porque un monto sin moneda no significa nada', () => {
        expect(construirPaymentRequest(minimo, 1).moneda).toBe('PEN');
        expect(construirPaymentRequest({ ...completo, moneda: null }, 1).moneda).toBe('PEN');
    });

    it('sin documento del beneficiario manda cadena vacía, que es lo que el backend exige', () => {
        expect(construirPaymentRequest(minimo, 1).beneficiarioDocumento).toBe('');
        expect(construirPaymentRequest({ ...completo, beneficiarioDocumento: null }, 1).beneficiarioDocumento).toBe('');
    });

    it('sin cuenta bancaria omite el campo en vez de mandar null', () => {
        expect(construirPaymentRequest(minimo, 1).bankAccountId).toBeUndefined();
        expect(construirPaymentRequest({ ...completo, bankAccountId: null }, 1).bankAccountId).toBeUndefined();
    });

    it('conserva la cuenta bancaria con id 0 en vez de tomarla por ausente', () => {
        // `?? undefined` y no `|| undefined`: un id 0 es un id, no un hueco.
        expect(construirPaymentRequest({ ...completo, bankAccountId: 0 }, 1).bankAccountId).toBe(0);
    });

    it('conserva un monto de 0 tal cual, para que el rechazo lo dé la validación', () => {
        expect(construirPaymentRequest({ ...minimo, monto: 0 }, 1).monto).toBe(0);
    });
});
