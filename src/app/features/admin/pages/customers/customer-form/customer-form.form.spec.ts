import { describe, expect, it } from 'vitest';
import { construirCustomerRequest, CustomerFormRaw } from './customer-form.form';

const COMPLETO: CustomerFormRaw = {
    tipoCliente: 'PERSONA_JURIDICA',
    tipoDocumento: 'RUC',
    numeroDocumento: '20123456789',
    nombres: 'Comercial Andina',
    apellidos: 'Pérez',
    razonSocial: 'Comercial Andina S.A.C.',
    nombreComercial: 'Andina',
    email: 'ventas@andina.pe',
    telefono: '014567890',
    celular: '987654321',
    condicionPago: 'CREDITO_30',
    limiteCredito: 5000,
    notas: 'Cliente preferente',
    activo: true,
};

/** Sólo lo obligatorio; todo lo opcional ausente. */
const MINIMO: CustomerFormRaw = {
    tipoCliente: 'PERSONA_NATURAL',
    tipoDocumento: 'DNI',
    numeroDocumento: '45678901',
    nombres: 'Ana',
};

describe('construirCustomerRequest', () => {
    it('con todo relleno pasa cada campo tal cual y añade la empresa', () => {
        expect(construirCustomerRequest(COMPLETO, 7)).toEqual({
            companyId: 7,
            tipoCliente: 'PERSONA_JURIDICA',
            tipoDocumento: 'RUC',
            numeroDocumento: '20123456789',
            nombres: 'Comercial Andina',
            apellidos: 'Pérez',
            razonSocial: 'Comercial Andina S.A.C.',
            nombreComercial: 'Andina',
            email: 'ventas@andina.pe',
            telefono: '014567890',
            celular: '987654321',
            condicionPago: 'CREDITO_30',
            limiteCredito: 5000,
            notas: 'Cliente preferente',
            activo: true,
        });
    });

    it('nunca envía saldoCredito: lo calcula el backend', () => {
        const dto = construirCustomerRequest(COMPLETO, 7);
        expect('saldoCredito' in dto).toBe(false);
    });

    it('sin opcionales aplica los defaults uno a uno', () => {
        const dto = construirCustomerRequest(MINIMO, 1);
        expect(dto.apellidos).toBeNull();
        expect(dto.razonSocial).toBeNull();
        expect(dto.nombreComercial).toBeNull();
        expect(dto.email).toBeNull();
        expect(dto.telefono).toBeNull();
        expect(dto.celular).toBeNull();
        expect(dto.notas).toBeNull();
        expect(dto.condicionPago).toBe('CONTADO');
        expect(dto.limiteCredito).toBe(0);
        expect(dto.activo).toBe(true);
    });

    it('la cadena vacía es «sin dato» y sale como null, no como ""', () => {
        const dto = construirCustomerRequest(
            { ...MINIMO, apellidos: '', email: '', telefono: '', celular: '', notas: '', razonSocial: '', nombreComercial: '' },
            1,
        );
        expect(dto.apellidos).toBeNull();
        expect(dto.email).toBeNull();
        expect(dto.telefono).toBeNull();
        expect(dto.celular).toBeNull();
        expect(dto.notas).toBeNull();
        expect(dto.razonSocial).toBeNull();
        expect(dto.nombreComercial).toBeNull();
    });

    it('condicionPago vacía cae a CONTADO', () => {
        expect(construirCustomerRequest({ ...MINIMO, condicionPago: '' }, 1).condicionPago).toBe('CONTADO');
        expect(construirCustomerRequest({ ...MINIMO, condicionPago: null }, 1).condicionPago).toBe('CONTADO');
    });

    it('un límite de crédito de 0 o nulo se envía como 0', () => {
        expect(construirCustomerRequest({ ...MINIMO, limiteCredito: 0 }, 1).limiteCredito).toBe(0);
        expect(construirCustomerRequest({ ...MINIMO, limiteCredito: null }, 1).limiteCredito).toBe(0);
    });

    it('un false explícito en activo NO lo pisa el default: es la baja lógica', () => {
        expect(construirCustomerRequest({ ...MINIMO, activo: false }, 1).activo).toBe(false);
    });

    it('activo null o ausente equivale a activo (alta normal)', () => {
        expect(construirCustomerRequest({ ...MINIMO, activo: null }, 1).activo).toBe(true);
        expect(construirCustomerRequest(MINIMO, 1).activo).toBe(true);
    });

    it('la empresa activa siempre viaja como companyId', () => {
        expect(construirCustomerRequest(MINIMO, 42).companyId).toBe(42);
    });
});
