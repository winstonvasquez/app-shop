import { describe, expect, it } from 'vitest';
import {
    RECLAMO_FORM_VACIO, ReclamoFormValue, construirReclamo, erroresDeReclamo,
    fechaLimiteLegible, mensajeDeFalloReclamo, plazoDeReclamo,
} from './reclamo.form';

const valido = (p: Partial<ReclamoFormValue> = {}): ReclamoFormValue => ({
    ...RECLAMO_FORM_VACIO,
    consumidorNombre: 'Ana Quispe', consumidorNumDoc: '45678912', domicilio: 'Av. Larco 123',
    email: 'ana@correo.pe', bienDescripcion: 'Polo talla M', detalle: 'Llegó roto', pedidoConsumidor: 'Reembolso',
    ...p,
});

describe('erroresDeReclamo', () => {
    it('un formulario completo es válido', () => expect(erroresDeReclamo(valido())).toEqual({}));

    it('el formulario vacío marca los obligatorios', () => {
        const e = erroresDeReclamo(RECLAMO_FORM_VACIO);
        expect(Object.keys(e).sort()).toEqual(
            ['bienDescripcion', 'consumidorNombre', 'consumidorNumDoc', 'detalle', 'domicilio', 'email', 'pedidoConsumidor']);
    });

    it('documento según tipo: DNI 8 dígitos, RUC con módulo 11, pasaporte alfanumérico', () => {
        expect(erroresDeReclamo(valido({ consumidorNumDoc: '1234' })).consumidorNumDoc).toBeDefined();
        expect(erroresDeReclamo(valido({ consumidorTipoDoc: '6', consumidorNumDoc: '20123456789' })).consumidorNumDoc).toBeDefined();
        expect(erroresDeReclamo(valido({ consumidorTipoDoc: '7', consumidorNumDoc: 'AB-1234' })).consumidorNumDoc).toBeUndefined();
    });

    it('el apoderado sólo se exige si es menor de edad', () => {
        expect(erroresDeReclamo(valido()).apoderadoNombre).toBeUndefined();
        const e = erroresDeReclamo(valido({ menorEdad: true }));
        expect(e.apoderadoNombre).toBeDefined();
        expect(e.apoderadoNumDoc).toContain('obligatorio');
        expect(erroresDeReclamo(valido({ menorEdad: true, apoderadoNombre: 'Luis', apoderadoNumDoc: '45678912' }))).toEqual({});
    });

    it('correo, monto y topes de longitud', () => {
        expect(erroresDeReclamo(valido({ email: 'sin-arroba' })).email).toBeDefined();
        expect(erroresDeReclamo(valido({ montoReclamado: '-5' })).montoReclamado).toBeDefined();
        expect(erroresDeReclamo(valido({ montoReclamado: 'abc' })).montoReclamado).toBeDefined();
        expect(erroresDeReclamo(valido({ montoReclamado: '0' })).montoReclamado).toBeUndefined();
        expect(erroresDeReclamo(valido({ detalle: 'x'.repeat(2001) })).detalle).toContain('2000');
    });
});

describe('construirReclamo', () => {
    it('recorta, omite lo vacío y no manda apoderado si no es menor', () => {
        const r = construirReclamo(valido({ consumidorNombre: '  Ana  ', apoderadoNombre: 'Luis', montoReclamado: '49.90' }));
        expect(r.consumidorNombre).toBe('Ana');
        expect(r.telefono).toBeUndefined();
        expect(r.apoderadoNombre).toBeUndefined();
        expect(r.montoReclamado).toBe(49.9);
    });

    it('menor de edad: viaja el apoderado; queja y servicio se respetan', () => {
        const r = construirReclamo(valido({ menorEdad: true, apoderadoNombre: 'Luis', apoderadoNumDoc: '45678912', tipo: 'QUEJA', bienTipo: 'SERVICIO' }));
        expect(r).toMatchObject({ apoderadoNombre: 'Luis', apoderadoTipoDoc: '1', apoderadoNumDoc: '45678912', tipo: 'QUEJA', bienTipo: 'SERVICIO' });
    });
});

describe('mensajes y plazo', () => {
    it('429 y 400 se explican', () => {
        expect(mensajeDeFalloReclamo(429, undefined)).toContain('demasiados reclamos');
        expect(mensajeDeFalloReclamo(400, 'No se pudo identificar la tienda desde la que se registra el reclamo'))
            .toContain('identificar la tienda');
        expect(mensajeDeFalloReclamo(500, undefined)).toContain('más tarde');
    });

    it('fecha límite legible y badge del plazo', () => {
        expect(fechaLimiteLegible('2026-12-05')).toBe('05/12/2026');
        expect(plazoDeReclamo({ estado: 'PENDIENTE', vencido: true, fechaLimiteRespuesta: '2026-12-05' }).badge).toBe('badge-error');
        expect(plazoDeReclamo({ estado: 'PENDIENTE', vencido: false, fechaLimiteRespuesta: '2026-12-05' }).texto).toBe('Vence 05/12/2026');
        expect(plazoDeReclamo({ estado: 'RESPONDIDO', vencido: false, fechaLimiteRespuesta: '2026-12-05' }).badge).toBe('badge-success');
    });
});

describe('monto como number (input type=number)', () => {
    it('no lanza y lo envía como número', () => {
        const f = { ...RECLAMO_FORM_VACIO, montoReclamado: 25.5 as unknown as string };
        expect(() => erroresDeReclamo(f)).not.toThrow();
        expect(construirReclamo(f).montoReclamado).toBe(25.5);
    });
});
