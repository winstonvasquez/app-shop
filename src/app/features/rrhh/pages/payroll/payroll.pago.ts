import { Payroll } from '../../models/payroll.model';

/**
 * «En pago» = APROBADO con pagoId: RRHH ya solicitó el pago a tesorería y espera su confirmación
 * (callback pago-confirmado → PAGADO). Si tesorería lo rechaza el backend libera el pagoId y la
 * planilla vuelve a APROBADO sin pagoId, es decir vuelve a ofrecerse «Solicitar pago».
 */
export function enPagoTesoreria(p: Pick<Payroll, 'estado' | 'pagoId'>): boolean {
    return p.estado === 'APROBADO' && p.pagoId != null;
}

/** «Solicitar pago» sólo mientras no haya pago vigente en tesorería. */
export function puedeSolicitarPago(p: Pick<Payroll, 'estado' | 'pagoId'>): boolean {
    return p.estado === 'APROBADO' && p.pagoId == null;
}

/** Texto del estado: distingue el estado intermedio «Pago solicitado a tesorería». */
export function etiquetaEstadoPlanilla(p: Pick<Payroll, 'estado' | 'pagoId'>): string {
    return enPagoTesoreria(p) ? 'Pago solicitado a tesorería' : p.estado;
}

/**
 * Vencimiento de la CTS (depósito 15/05 o 15/11) — misma regla que el backend al crear la
 * obligación en tesorería; el DTO no lo expone, se deriva del periodo «YYYY-MM» (mayo/noviembre).
 */
export function vencimientoCts(periodo: string): string | null {
    const [anio, mes] = periodo.split('-');
    return mes === '05' || mes === '11' ? `15/${mes}/${anio}` : null;
}
