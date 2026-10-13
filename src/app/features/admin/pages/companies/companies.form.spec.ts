import { describe, expect, it } from 'vitest';
import { CompanyFormRaw, construirCompanyRequest } from './companies.form';

const MINIMO: CompanyFormRaw = { name: 'Andina', ruc: '20000000001', active: true };

describe('construirCompanyRequest', () => {
    it('con todo relleno pasa cada campo tal cual', () => {
        expect(construirCompanyRequest({
            name: 'Andina', ruc: '20000000001', active: true,
            legalName: 'Comercial Andina S.A.C.', address: 'Av. Perú 123',
            phone: '014567890', email: 'contacto@andina.pe',
            logoUrl: '/logos/1.png', domain: 'andina.microshop.pe',
        })).toEqual({
            name: 'Andina', ruc: '20000000001', active: true,
            legalName: 'Comercial Andina S.A.C.', address: 'Av. Perú 123',
            phone: '014567890', email: 'contacto@andina.pe',
            logoUrl: '/logos/1.png', domain: 'andina.microshop.pe',
        });
    });

    it('sin opcionales los omite uno a uno (undefined, no null ni "")', () => {
        const dto = construirCompanyRequest(MINIMO);
        expect(dto.legalName).toBeUndefined();
        expect(dto.address).toBeUndefined();
        expect(dto.phone).toBeUndefined();
        expect(dto.email).toBeUndefined();
        expect(dto.logoUrl).toBeUndefined();
        expect(dto.domain).toBeUndefined();
    });

    it('el dominio vacío se omite: nunca se manda "" (rompería el tenant anónimo)', () => {
        expect(construirCompanyRequest({ ...MINIMO, domain: '' }).domain).toBeUndefined();
        expect(construirCompanyRequest({ ...MINIMO, domain: null }).domain).toBeUndefined();
    });

    it('el logo vacío se omite en vez de borrarse por accidente', () => {
        expect(construirCompanyRequest({ ...MINIMO, logoUrl: '' }).logoUrl).toBeUndefined();
    });

    it('active false viaja explícito: es la baja lógica de la empresa', () => {
        expect(construirCompanyRequest({ ...MINIMO, active: false }).active).toBe(false);
    });

    it('nombre y RUC viajan siempre, incluso vacíos (el formulario los valida antes)', () => {
        const dto = construirCompanyRequest({ name: '', ruc: '', active: true });
        expect(dto.name).toBe('');
        expect(dto.ruc).toBe('');
    });
});
