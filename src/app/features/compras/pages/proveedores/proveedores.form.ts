import { MONEDA } from '@shared/constants/sunat.constants';
import { Proveedor } from '../../models/proveedor.model';

/**
 * Valores que alimentan el drawer de edición de proveedor. Ningún campo es
 * opcional: el formulario reactivo necesita un valor concreto por control, y el
 * maestro que llega del backend trae los opcionales ausentes.
 */
export interface ValoresFormularioProveedor {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    condicionSunat: string;
    estadoSunat: string;
    estado: string;
    domicilioFiscal: string;
    contactoNombre: string;
    contactoTelefono: string;
    contactoEmail: string;
    banco: string;
    cuentaBanco: string;
    condicionPago: string;
    monedaPreferida: string;
    nivelProveedor: string;
    agenteRetencion: boolean;
}

/**
 * Regla de negocio: al reabrir un proveedor antiguo (guardado antes de que
 * existieran estos campos) la edición debe partir de los MISMOS defaults que usa
 * el alta, no de controles vacíos — de lo contrario reabrir y guardar dejaría al
 * proveedor sin condición de pago ni moneda. Los defaults son los del padrón
 * SUNAT (HABIDO / ACTIVO) y los comerciales (CONTADO / PEN).
 *
 * El relleno es `??` y no `||` a propósito: solo suple ausencia (null/undefined).
 * Un valor guardado explícitamente —incluidos `''` y el `false` de
 * `agenteRetencion`— se respeta tal cual, porque es dato del usuario y no un hueco.
 */
export function valoresFormularioProveedor(proveedor: Proveedor): ValoresFormularioProveedor {
    return {
        ruc: proveedor.ruc,
        razonSocial: proveedor.razonSocial,
        nombreComercial: proveedor.nombreComercial ?? '',
        condicionSunat: proveedor.condicionSunat ?? 'HABIDO',
        estadoSunat: proveedor.estadoSunat ?? 'ACTIVO',
        estado: proveedor.estado ?? 'ACTIVO',
        domicilioFiscal: proveedor.domicilioFiscal ?? '',
        contactoNombre: proveedor.contactoNombre ?? '',
        contactoTelefono: proveedor.contactoTelefono ?? '',
        contactoEmail: proveedor.contactoEmail ?? '',
        banco: proveedor.banco ?? '',
        cuentaBanco: proveedor.cuentaBanco ?? '',
        condicionPago: proveedor.condicionPago ?? 'CONTADO',
        monedaPreferida: proveedor.monedaPreferida ?? MONEDA.PEN,
        nivelProveedor: proveedor.nivelProveedor ?? '',
        agenteRetencion: proveedor.agenteRetencion ?? false
    };
}
