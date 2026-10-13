import { CPE_TIPO, MONEDA } from '@shared/constants/sunat.constants';
import { OrdenCompra } from '../../compras/models/orden-compra.model';
import { formatFechaPLE } from './ple-formato.util';

/**
 * Una línea del PLE Libro 8.1 (Registro de Compras), 31 campos separados por `|`.
 *
 * Formato DISTINTO del libro 14: aquí la fecha va en el campo 3 (antes del tipo de
 * comprobante) y no hay correlativo de asiento. No unificar los dos generadores: son
 * dos estructuras posicionales de SUNAT, y compartirlas haría que un cambio en uno
 * corrompiera el otro en silencio.
 *
 * Reglas de negocio codificadas:
 * - El registro se arma desde la ORDEN DE COMPRA, no desde la factura del proveedor:
 *   por eso todo comprobante se informa como factura ('01') y el proveedor siempre
 *   como RUC ('6') — un proveedor formal lo tiene.
 * - Serie y número se parten del código de la OC por el primer guion («OC-2026-0001»
 *   → serie «OC», número «20260001»).
 * - Estado (campo 29): '8' si la orden fue cancelada, '1' si sigue vigente.
 * - Sólo se liquida la base gravada y su IGV; las demás bases van en 0.00.
 */
export function lineaPLE08(o: OrdenCompra, indice: number, periodoStr: string): string {
    const cuo = String(indice + 1).padStart(6, '0');
    const fechaFmt = formatFechaPLE(o.fechaEmision);
    const tipoCpe = CPE_TIPO.FACTURA;
    const serie = o.codigo?.split('-')[0] ?? 'F001';
    const numero = o.codigo?.split('-').slice(1).join('') ?? String(indice + 1).padStart(8, '0');
    const base = (o.subtotal ?? 0).toFixed(2);
    const igv = (o.igv ?? 0).toFixed(2);
    const total = (o.total ?? 0).toFixed(2);
    const proveedor = o.proveedorNombre ?? String(o.proveedorId ?? '');
    const estado = o.estado === 'CANCELADA' ? '8' : '1';
    return [periodoStr, cuo, fechaFmt, '', tipoCpe, serie, numero,
            '6', '', proveedor,
            base, igv, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00',
            total, MONEDA.PEN, '1.000', '', '', '', '0', '0.00', '0.00',
            estado, '0', '0'].join('|');
}

/** Libro 8 completo. Separador de línea CRLF, que es lo que exige el PLE. */
export function generarPLE08(ordenes: readonly OrdenCompra[], periodoStr: string): string {
    return ordenes.map((o, i) => lineaPLE08(o, i, periodoStr)).join('\r\n');
}
