import { describe, expect, it } from 'vitest';
import { ZonaEnvio } from '@core/services/zona-envio.service';
import {
    comprobanteParaPedido, DatosComprobante, errorDeComprobante, esDniValido, esRucValido, igvIncluido,
    zonaAutoseleccionada,
} from './checkout-page.rules';

const boleta = (p: Partial<DatosComprobante> = {}): DatosComprobante =>
    ({ tipo: 'BOLETA', tipoDoc: '1', numDoc: '', razonSocial: '', ...p });
const factura = (p: Partial<DatosComprobante> = {}): DatosComprobante =>
    ({ tipo: 'FACTURA', tipoDoc: '1', numDoc: '20100070970', razonSocial: 'Empresa SAC', ...p });

describe('esRucValido', () => {
    it('acepta un RUC con dígito verificador correcto', () => expect(esRucValido('20100070970')).toBe(true));
    it('rechaza un dígito verificador incorrecto', () => expect(esRucValido('20100070971')).toBe(false));
    it('rechaza prefijo desconocido', () => expect(esRucValido('30100070970')).toBe(false));
    it('rechaza longitud distinta de 11 y no numéricos', () => {
        expect(esRucValido('2010007097')).toBe(false);
        expect(esRucValido('2010007097a')).toBe(false);
    });
});

describe('esDniValido', () => {
    it('8 dígitos', () => expect(esDniValido('45678912')).toBe(true));
    it('rechaza 00000000, longitud y letras', () => {
        expect(esDniValido('00000000')).toBe(false);
        expect(esDniValido('4567891')).toBe(false);
        expect(esDniValido('4567891a')).toBe(false);
    });
});

describe('errorDeComprobante', () => {
    it('boleta sin documento por debajo del umbral es válida', () => expect(errorDeComprobante(boleta(), 700)).toBeNull());
    it('boleta sin documento por encima de S/ 700 exige documento', () =>
        expect(errorDeComprobante(boleta(), 700.01)).toContain('700'));
    it('boleta con DNI mal formado se rechaza', () =>
        expect(errorDeComprobante(boleta({ numDoc: '123' }), 50)).toBe('El DNI debe tener 8 dígitos'));
    it('boleta con pasaporte sólo limita la longitud', () => {
        expect(errorDeComprobante(boleta({ tipoDoc: '7', numDoc: 'AB123' }), 50)).toBeNull();
        expect(errorDeComprobante(boleta({ tipoDoc: '7', numDoc: 'X'.repeat(21) }), 50)).not.toBeNull();
    });
    it('factura válida', () => expect(errorDeComprobante(factura(), 50)).toBeNull());
    it('factura con RUC inválido o sin razón social se rechaza', () => {
        expect(errorDeComprobante(factura({ numDoc: '20100070971' }), 50)).toContain('RUC');
        expect(errorDeComprobante(factura({ razonSocial: '  ' }), 50)).toContain('razón social');
    });
});

describe('comprobanteParaPedido', () => {
    it('boleta sin documento manda sólo el tipo', () =>
        expect(comprobanteParaPedido(boleta())).toEqual({ tipoComprobante: 'BOLETA' }));
    it('boleta con documento manda tipo y número recortado', () =>
        expect(comprobanteParaPedido(boleta({ numDoc: ' 45678912 ' })))
            .toEqual({ tipoComprobante: 'BOLETA', tipoDocCliente: '1', numDocCliente: '45678912' }));
    it('factura fuerza tipoDoc 6 aunque el estado guarde otro', () =>
        expect(comprobanteParaPedido(factura({ tipoDoc: '4' }))).toEqual({
            tipoComprobante: 'FACTURA', tipoDocCliente: '6', numDocCliente: '20100070970', razonSocial: 'Empresa SAC',
        }));
});

describe('igvIncluido', () => {
    it('total·0.18/1.18 a céntimos', () => {
        expect(igvIncluido(118)).toBe(18);
        expect(igvIncluido(100)).toBe(15.25);
        expect(igvIncluido(0)).toBe(0);
    });
});

describe('zonaAutoseleccionada', () => {
    const z = (id: number, distrito: string): ZonaEnvio =>
        ({ id, nombre: distrito, departamento: 'Lima', provincia: 'Lima', distrito, costoEnvio: 10, tiempoEstimadoDias: 2 });

    it('elige la coincidencia de distrito sin mirar tildes ni mayúsculas', () =>
        expect(zonaAutoseleccionada([z(1, 'Barranco'), z(2, 'Jesús María')], 'JESUS MARIA')?.id).toBe(2));
    it('con una única opción la toma', () => expect(zonaAutoseleccionada([z(1, 'Barranco')], 'Lince')?.id).toBe(1));
    it('con varias y sin coincidencia no elige: lo decide el cliente', () =>
        expect(zonaAutoseleccionada([z(1, 'Barranco'), z(2, 'Surco')], 'Lince')).toBeNull());
    it('sin zonas devuelve null', () => expect(zonaAutoseleccionada([], 'Lince')).toBeNull());
});
