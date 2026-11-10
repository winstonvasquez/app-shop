import { ZonaEnvio } from '@core/services/zona-envio.service';

/** Reglas puras del checkout (comprobante y zona de envío). Sin Angular: se prueban con literales. */

export type TipoComprobante = 'BOLETA' | 'FACTURA';

/** Catálogo 06 SUNAT: 1=DNI, 4=CE, 6=RUC, 7=Pasaporte. */
export type TipoDocumento = '1' | '4' | '6' | '7';

export interface DatosComprobante {
    tipo: TipoComprobante;
    /** Sólo cuenta en BOLETA; la FACTURA siempre es con RUC ('6'). */
    tipoDoc: TipoDocumento;
    numDoc: string;
    razonSocial: string;
}

/** Espejo de BOLETA_MONTO_IDENTIFICACION (default del backend). Si el parámetro cambia, el backend manda. */
export const UMBRAL_BOLETA_IDENTIFICADA = 700;

const FACTORES_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIJOS_RUC = ['10', '15', '17', '20'];

/** RUC de 11 dígitos, prefijo 10/15/17/20 y dígito verificador módulo 11 (mismo algoritmo que el backend). */
export function esRucValido(ruc: string): boolean {
    if (!/^\d{11}$/.test(ruc) || !PREFIJOS_RUC.includes(ruc.slice(0, 2))) return false;
    const suma = FACTORES_RUC.reduce((acc, f, i) => acc + Number(ruc[i]) * f, 0);
    return (11 - (suma % 11)) % 10 === Number(ruc[10]);
}

/** DNI de 8 dígitos que no sea el «sin documento» 00000000. */
export function esDniValido(dni: string): boolean {
    return /^\d{8}$/.test(dni) && !/^0+$/.test(dni);
}

/** Texto del primer problema del comprobante, o `null` si es válido para este total. */
export function errorDeComprobante(c: DatosComprobante, total: number): string | null {
    const num = c.numDoc.trim();
    if (c.tipo === 'FACTURA') {
        if (!esRucValido(num)) return 'La factura requiere un RUC válido de 11 dígitos';
        if (!c.razonSocial.trim()) return 'La factura requiere la razón social';
        return null;
    }
    if (!num) {
        return total > UMBRAL_BOLETA_IDENTIFICADA
            ? `La boleta por más de S/ ${UMBRAL_BOLETA_IDENTIFICADA} requiere tu documento (DNI, CE o pasaporte)`
            : null;
    }
    if (c.tipoDoc === '1') return esDniValido(num) ? null : 'El DNI debe tener 8 dígitos';
    return num.length <= 20 ? null : 'El documento admite hasta 20 caracteres';
}

export interface ComprobanteDelPedido {
    tipoComprobante: TipoComprobante;
    tipoDocCliente?: TipoDocumento;
    numDocCliente?: string;
    razonSocial?: string;
}

/** Campos del pedido: la boleta sin documento no manda tipo ni número (null != cadena vacía para el backend). */
export function comprobanteParaPedido(c: DatosComprobante): ComprobanteDelPedido {
    const num = c.numDoc.trim();
    if (c.tipo === 'FACTURA') {
        return { tipoComprobante: 'FACTURA', tipoDocCliente: '6', numDocCliente: num, razonSocial: c.razonSocial.trim() };
    }
    return num
        ? { tipoComprobante: 'BOLETA', tipoDocCliente: c.tipoDoc, numDocCliente: num }
        : { tipoComprobante: 'BOLETA' };
}

/** IGV contenido en un total con IGV (18%), redondeado a céntimos. */
export function igvIncluido(total: number): number {
    return Math.round(((total * 0.18) / 1.18) * 100) / 100;
}

const normalizar = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Zona a autoseleccionar tras consultar por distrito. Sólo se elige sola si coincide el distrito o es la
 * única opción: cuando el backend cae al departamento hay varias tarifas y elegir `zonas[0]` cobraría un
 * flete que el cliente no vio escoger.
 */
export function zonaAutoseleccionada(zonas: readonly ZonaEnvio[], distrito: string): ZonaEnvio | null {
    const exacta = zonas.find(z => normalizar(z.distrito) === normalizar(distrito));
    return exacta ?? (zonas.length === 1 ? zonas[0] : null);
}
