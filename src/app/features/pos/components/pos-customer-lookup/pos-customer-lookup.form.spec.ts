import { describe, expect, it } from 'vitest';
import { construirClienteRapido } from './pos-customer-lookup.form';

describe('construirClienteRapido', () => {
    it('sin nombre no hay alta', () => {
        expect(construirClienteRapido(1, '12345678', '   ')).toBeNull();
    });

    it('DNI: persona natural con el nombre dado', () => {
        expect(construirClienteRapido(1, '12345678', ' Ana Pérez ')).toEqual({
            companyId: 1, tipoCliente: 'PERSONA_NATURAL', tipoDocumento: 'DNI',
            numeroDocumento: '12345678', nombres: 'Ana Pérez', razonSocial: undefined,
        });
    });

    it('RUC: persona jurídica y el nombre viaja como razón social', () => {
        const r = construirClienteRapido(1, '20123456789', 'ACME SAC');
        expect(r?.tipoDocumento).toBe('RUC');
        expect(r?.razonSocial).toBe('ACME SAC');
    });
});
