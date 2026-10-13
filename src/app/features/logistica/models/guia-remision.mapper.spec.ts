import { describe, expect, it } from 'vitest';
import {
    construirDtoGuiaRemision,
    construirItemsGuiaRemision,
    ItemFormularioGuia,
    ValoresFormularioGuia,
} from './guia-remision.mapper';

const linea: ItemFormularioGuia = {
    productoNombre: 'Cemento Sol 42.5kg',
    sku: 'CEM-425',
    cantidad: 12,
    unidad: 'BLS',
    descripcion: 'Paletizado',
};

const formularioCompleto: ValoresFormularioGuia = {
    serie: 'T001',
    numeroDocumento: '000123',
    fechaEmision: '2026-08-06',
    fechaInicioTraslado: '2026-08-07',
    almacenOrigenId: 'alm-1',
    direccionOrigen: 'Av. Argentina 1234',
    ubigeoOrigen: '150101',
    destinatarioRuc: '20123456789',
    destinatarioRazonSocial: 'Constructora Lima SAC',
    destinatarioDireccion: 'Av. La Marina 500',
    ubigeoDestino: '150132',
    puntoLlegada: 'Obra San Miguel',
    motivoTraslado: '01',
    descripcionTraslado: 'Venta de materiales',
    modalidadTraslado: '01',
    pesoBrutoTotal: 510,
    transportistaRuc: '20987654321',
    transportistaRazonSocial: 'Transportes Perú SAC',
    transportistaMtc: 'MTC-0099',
    vehiculoPlaca: 'ABC-123',
    conductorDocumento: '45678912',
    conductorNombre: 'Juan Pérez',
    conductorLicencia: 'Q45678912',
};

describe('construirDtoGuiaRemision', () => {
    it('con el formulario completo copia los 22 campos tal cual', () => {
        expect(construirDtoGuiaRemision(formularioCompleto, [linea])).toEqual({
            serie: 'T001',
            numeroDocumento: '000123',
            fechaEmision: '2026-08-06',
            fechaInicioTraslado: '2026-08-07',
            almacenOrigenId: 'alm-1',
            direccionOrigen: 'Av. Argentina 1234',
            ubigeoOrigen: '150101',
            destinatarioRuc: '20123456789',
            destinatarioRazonSocial: 'Constructora Lima SAC',
            destinatarioDireccion: 'Av. La Marina 500',
            ubigeoDestino: '150132',
            puntoLlegada: 'Obra San Miguel',
            motivoTraslado: '01',
            descripcionTraslado: 'Venta de materiales',
            modalidadTraslado: '01',
            pesoBrutoTotal: 510,
            transportistaRuc: '20987654321',
            transportistaRazonSocial: 'Transportes Perú SAC',
            transportistaMtc: 'MTC-0099',
            vehiculoPlaca: 'ABC-123',
            conductorDocumento: '45678912',
            conductorNombre: 'Juan Pérez',
            conductorLicencia: 'Q45678912',
            items: [
                {
                    productoNombre: 'Cemento Sol 42.5kg',
                    sku: 'CEM-425',
                    cantidad: 12,
                    unidad: 'BLS',
                    descripcion: 'Paletizado',
                },
            ],
        });
    });

    it('con el formulario vacío omite TODOS los opcionales en vez de mandarlos en blanco', () => {
        // Un '' en el XML de la GRE es un dato declarado en blanco ante SUNAT, no un
        // dato omitido: por eso cada opcional tiene que salir undefined.
        const dto = construirDtoGuiaRemision({}, []);

        expect(dto.fechaEmision).toBeUndefined();
        expect(dto.fechaInicioTraslado).toBeUndefined();
        expect(dto.ubigeoOrigen).toBeUndefined();
        expect(dto.destinatarioRuc).toBeUndefined();
        expect(dto.destinatarioRazonSocial).toBeUndefined();
        expect(dto.destinatarioDireccion).toBeUndefined();
        expect(dto.ubigeoDestino).toBeUndefined();
        expect(dto.puntoLlegada).toBeUndefined();
        expect(dto.descripcionTraslado).toBeUndefined();
        expect(dto.pesoBrutoTotal).toBeUndefined();
        expect(dto.transportistaRuc).toBeUndefined();
        expect(dto.transportistaRazonSocial).toBeUndefined();
        expect(dto.transportistaMtc).toBeUndefined();
        expect(dto.vehiculoPlaca).toBeUndefined();
        expect(dto.conductorDocumento).toBeUndefined();
        expect(dto.conductorNombre).toBeUndefined();
        expect(dto.conductorLicencia).toBeUndefined();
        expect(dto.items).toEqual([]);
    });

    it('convierte a undefined los opcionales que llegan como cadena vacía o null', () => {
        const vacios: ValoresFormularioGuia = {
            fechaEmision: '',
            fechaInicioTraslado: null,
            ubigeoOrigen: '',
            destinatarioRuc: null,
            destinatarioRazonSocial: '',
            destinatarioDireccion: null,
            ubigeoDestino: '',
            puntoLlegada: null,
            descripcionTraslado: '',
            transportistaRuc: null,
            transportistaRazonSocial: '',
            transportistaMtc: null,
            vehiculoPlaca: '',
            conductorDocumento: null,
            conductorNombre: '',
            conductorLicencia: null,
        };
        const dto = construirDtoGuiaRemision(vacios, []);

        expect(dto.fechaEmision).toBeUndefined();
        expect(dto.fechaInicioTraslado).toBeUndefined();
        expect(dto.ubigeoOrigen).toBeUndefined();
        expect(dto.destinatarioRuc).toBeUndefined();
        expect(dto.destinatarioRazonSocial).toBeUndefined();
        expect(dto.destinatarioDireccion).toBeUndefined();
        expect(dto.ubigeoDestino).toBeUndefined();
        expect(dto.puntoLlegada).toBeUndefined();
        expect(dto.descripcionTraslado).toBeUndefined();
        expect(dto.transportistaRuc).toBeUndefined();
        expect(dto.transportistaRazonSocial).toBeUndefined();
        expect(dto.transportistaMtc).toBeUndefined();
        expect(dto.vehiculoPlaca).toBeUndefined();
        expect(dto.conductorDocumento).toBeUndefined();
        expect(dto.conductorNombre).toBeUndefined();
        expect(dto.conductorLicencia).toBeUndefined();
    });

    it('los cinco obligatorios caen a cadena vacía, para que el rechazo lo dé el backend', () => {
        const dto = construirDtoGuiaRemision({}, []);
        expect(dto.serie).toBe('');
        expect(dto.numeroDocumento).toBe('');
        expect(dto.almacenOrigenId).toBe('');
        expect(dto.direccionOrigen).toBe('');
        expect(dto.motivoTraslado).toBe('');
    });

    it('un obligatorio que llega como cadena vacía se manda vacío, no se omite', () => {
        // `?? ''` (no `|| undefined`): la clave está en que la propiedad EXISTA en el
        // payload, para que el 400 del backend diga qué falta.
        const dto = construirDtoGuiaRemision(
            { serie: '', numeroDocumento: '', almacenOrigenId: '', direccionOrigen: '', motivoTraslado: '' },
            []
        );
        expect(dto).toHaveProperty('serie', '');
        expect(dto).toHaveProperty('motivoTraslado', '');
    });

    it('sin modalidad de traslado cae a 02 (transporte privado), el default del alta', () => {
        expect(construirDtoGuiaRemision({}, []).modalidadTraslado).toBe('02');
        expect(construirDtoGuiaRemision({ modalidadTraslado: null }, []).modalidadTraslado).toBe('02');
    });

    it('respeta la modalidad 01 (transporte público) cuando el usuario la elige', () => {
        expect(construirDtoGuiaRemision({ modalidadTraslado: '01' }, []).modalidadTraslado).toBe('01');
    });

    it('conserva un peso bruto de 0: es un valor declarado, no un hueco', () => {
        expect(construirDtoGuiaRemision({ pesoBrutoTotal: 0 }, []).pesoBrutoTotal).toBe(0);
        expect(construirDtoGuiaRemision({ pesoBrutoTotal: null }, []).pesoBrutoTotal).toBeUndefined();
    });
});

describe('construirItemsGuiaRemision', () => {
    it('sin unidad cae a NIU, la unidad por defecto del catálogo 03 de SUNAT', () => {
        const [item] = construirItemsGuiaRemision([{ ...linea, unidad: '' }]);
        expect(item.unidad).toBe('NIU');
    });

    it('omite sku y descripción vacíos en vez de mandarlos en blanco', () => {
        const [item] = construirItemsGuiaRemision([{ ...linea, sku: '', descripcion: '' }]);
        expect(item.sku).toBeUndefined();
        expect(item.descripcion).toBeUndefined();
        expect(item.productoNombre).toBe('Cemento Sol 42.5kg');
    });

    it('conserva una cantidad de 0 y no la convierte en hueco', () => {
        expect(construirItemsGuiaRemision([{ ...linea, cantidad: 0 }])[0].cantidad).toBe(0);
    });

    it('mapea varias líneas conservando el orden y no manda productoId', () => {
        const items = construirItemsGuiaRemision([linea, { ...linea, productoNombre: 'Arena gruesa' }]);
        expect(items.map((i) => i.productoNombre)).toEqual(['Cemento Sol 42.5kg', 'Arena gruesa']);
        expect(items[0]).not.toHaveProperty('productoId');
    });

    it('sin líneas devuelve un array vacío', () => {
        expect(construirItemsGuiaRemision([])).toEqual([]);
    });
});
