import { CPE_TIPO } from '@shared/constants/sunat.constants';
import { formatFechaPLE } from './ple-formato.util';

/** Comprobante de venta tal como lo devuelve el registro de ventas del backend. */
export interface VentaPLE {
    id: string | number;
    fecha: string;
    tipoComprobante: string;
    serie: string;
    numero: string;
    rucCliente: string;
    razonSocial: string;
    baseImponible: number;
    igv: number;
    total: number;
    estado: string;
}

/**
 * Una línea del PLE Libro 14.1 (Registro de Ventas e Ingresos), 29 campos separados por `|`.
 *
 * El ORDEN de los campos ES el formato: SUNAT no lee cabeceras, lee posiciones, y un campo
 * corrido invalida el libro entero. NO reutilizar esta función para el libro 8 (compras),
 * que tiene 31 campos en otro orden.
 *
 * Reglas de negocio codificadas:
 * - CUO (campo 2) y correlativo (campo 3): numeración propia del libro, correlativa dentro
 *   del periodo. Se deriva del orden de la lista, empezando en 1.
 * - Un comprobante que no es factura ni boleta va con tipo '00' (no informado) en vez de
 *   quedar fuera del libro: la omisión es una inconsistencia más grave que el código genérico.
 * - Tipo de documento del cliente: 11 dígitos son RUC ('6'), cualquier otro largo se informa
 *   como DNI ('1').
 * - Estado (campo 28): '8' anulado, '1' registrado.
 * - Las bases distintas de la gravada (exonerada, inafecta, ISC, otros tributos) van en 0.00:
 *   el ERP hoy sólo liquida operaciones gravadas.
 */
export function lineaPLE14(v: VentaPLE, indice: number, periodoStr: string): string {
    const cuo = String(indice + 1).padStart(6, '0');
    const correlativo = 'M' + String(indice + 1).padStart(3, '0');
    const tipoCpe = v.tipoComprobante === 'FACTURA' ? CPE_TIPO.FACTURA
        : v.tipoComprobante === 'BOLETA' ? CPE_TIPO.BOLETA : '00';
    const fechaFmt = formatFechaPLE(v.fecha);
    const tipoDocliente = (v.rucCliente ?? '').length === 11 ? '6' : '1';
    const base = (v.baseImponible ?? 0).toFixed(2);
    const igv = (v.igv ?? 0).toFixed(2);
    const total = (v.total ?? 0).toFixed(2);
    const estado = v.estado === 'ANULADO' ? '8' : '1';
    return [periodoStr, cuo, correlativo, tipoCpe, v.serie ?? '', v.numero ?? '',
            fechaFmt, '', tipoDocliente, v.rucCliente ?? '', v.razonSocial ?? '',
            '0.00', base, '0.00', igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
            total, '1.000', '', '', '', '', estado, ''].join('|');
}

/** Libro 14 completo. Separador de línea CRLF, que es lo que exige el PLE. */
export function generarPLE14(ventas: readonly VentaPLE[], periodoStr: string): string {
    return ventas.map((v, i) => lineaPLE14(v, i, periodoStr)).join('\r\n');
}
