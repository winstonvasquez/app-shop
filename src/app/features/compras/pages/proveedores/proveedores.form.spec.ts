import { describe, expect, it } from 'vitest';
import { valoresFormularioProveedor } from './proveedores.form';
import { Proveedor } from '../../models/proveedor.model';

/** Proveedor con TODOS los opcionales presentes y distintos de su default. */
const completo: Proveedor = {
    id: 'p-1',
    ruc: '20123456789',
    razonSocial: 'Ferretería Central SAC',
    nombreComercial: 'FerreCentral',
    condicionSunat: 'NO HABIDO',
    estadoSunat: 'BAJA DE OFICIO',
    estado: 'INACTIVO',
    domicilioFiscal: 'Av. Abancay 123, Lima',
    contactoNombre: 'Rosa Quispe',
    contactoTelefono: '987654321',
    contactoEmail: 'rosa@ferrecentral.pe',
    banco: 'BCP',
    cuentaBanco: '191-1234567-0-99',
    condicionPago: 'CREDITO_30',
    monedaPreferida: 'USD',
    nivelProveedor: 'EXCELENTE',
    agenteRetencion: true
};

describe('valoresFormularioProveedor', () => {
    it('con todos los campos presentes los devuelve tal cual, sin aplicar ningún default', () => {
        expect(valoresFormularioProveedor(completo)).toEqual({
            ruc: '20123456789',
            razonSocial: 'Ferretería Central SAC',
            nombreComercial: 'FerreCentral',
            condicionSunat: 'NO HABIDO',
            estadoSunat: 'BAJA DE OFICIO',
            estado: 'INACTIVO',
            domicilioFiscal: 'Av. Abancay 123, Lima',
            contactoNombre: 'Rosa Quispe',
            contactoTelefono: '987654321',
            contactoEmail: 'rosa@ferrecentral.pe',
            banco: 'BCP',
            cuentaBanco: '191-1234567-0-99',
            condicionPago: 'CREDITO_30',
            monedaPreferida: 'USD',
            nivelProveedor: 'EXCELENTE',
            agenteRetencion: true
        });
    });

    it('sin ningún opcional aplica los 14 defaults, uno a uno', () => {
        // Proveedor mínimo: solo lo que el modelo exige (ruc + razonSocial).
        const minimo: Proveedor = { ruc: '20999999999', razonSocial: 'Proveedor Nuevo EIRL' };
        const v = valoresFormularioProveedor(minimo);

        // Identidad: se copia, no tiene default.
        expect(v.ruc).toBe('20999999999');
        expect(v.razonSocial).toBe('Proveedor Nuevo EIRL');
        // Defaults de padrón SUNAT.
        expect(v.condicionSunat).toBe('HABIDO');
        expect(v.estadoSunat).toBe('ACTIVO');
        // Default del maestro interno.
        expect(v.estado).toBe('ACTIVO');
        // Defaults comerciales.
        expect(v.condicionPago).toBe('CONTADO');
        expect(v.monedaPreferida).toBe('PEN');
        // Texto libre: cadena vacía, nunca undefined (el control la necesita).
        expect(v.nombreComercial).toBe('');
        expect(v.domicilioFiscal).toBe('');
        expect(v.contactoNombre).toBe('');
        expect(v.contactoTelefono).toBe('');
        expect(v.contactoEmail).toBe('');
        expect(v.banco).toBe('');
        expect(v.cuentaBanco).toBe('');
        expect(v.nivelProveedor).toBe('');
        // Marca booleana.
        expect(v.agenteRetencion).toBe(false);
    });

    it('respeta el `false` explícito de agenteRetencion en vez de tratarlo como hueco', () => {
        const noRetencion: Proveedor = { ...completo, agenteRetencion: false };
        expect(valoresFormularioProveedor(noRetencion).agenteRetencion).toBe(false);
    });

    it('respeta la cadena vacía guardada: `??` solo suple ausencia, no valores falsy', () => {
        // Si esto se cambiara a `||`, un proveedor con condicionPago borrado a
        // propósito volvería a CONTADO al reabrirlo, cambiando el dato en silencio.
        const conVacios: Proveedor = {
            ...completo,
            condicionPago: '',
            condicionSunat: '',
            monedaPreferida: '',
            estado: ''
        };
        const v = valoresFormularioProveedor(conVacios);
        expect(v.condicionPago).toBe('');
        expect(v.condicionSunat).toBe('');
        expect(v.monedaPreferida).toBe('');
        expect(v.estado).toBe('');
    });

    it('trata el null del JSON igual que el undefined y aplica el default', () => {
        // El modelo declara `string | undefined`, pero el backend serializa null.
        const conNulos = {
            ruc: '20111111111',
            razonSocial: 'Con Nulos SAC',
            nombreComercial: null,
            condicionPago: null,
            monedaPreferida: null,
            agenteRetencion: null
        } as unknown as Proveedor;
        const v = valoresFormularioProveedor(conNulos);
        expect(v.nombreComercial).toBe('');
        expect(v.condicionPago).toBe('CONTADO');
        expect(v.monedaPreferida).toBe('PEN');
        expect(v.agenteRetencion).toBe(false);
    });
});
