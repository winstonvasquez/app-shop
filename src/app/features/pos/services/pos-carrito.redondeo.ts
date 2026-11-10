import { MetodoPagoPos, PagoMixto } from '../models/venta-pos.model';

/**
 * POS-8: espejo de `VentaPosCommandService.redondeoEfectivo`. El efectivo se cobra redondeado A LA BAJA
 * a S/ 0.10 (a favor del cliente, Código del Consumidor); devuelve lo que se deja de cobrar (0.00–0.09).
 * Aritmética en céntimos para no arrastrar error de coma flotante.
 */
export function redondeoEfectivo(importe: number): number {
    const centimos = Math.round(importe * 100);
    return centimos <= 0 ? 0 : (centimos % 10) / 100;
}

/**
 * Redondeo de la venta según cómo se paga (misma regla que `resolverCobro` del servidor):
 * sólo la parte en EFECTIVO se redondea; sin efectivo no hay redondeo.
 * `totalFinal` es el resto a cobrar (total menos gift card).
 */
export function redondeoDeCobro(
    pagoDividido: boolean, metodoPago: MetodoPagoPos, pagos: readonly PagoMixto[], totalFinal: number,
): number {
    if (!pagoDividido) return metodoPago === 'EFECTIVO' ? redondeoEfectivo(totalFinal) : 0;
    if (!pagos.some(p => p.metodo === 'EFECTIVO')) return 0;
    const noEfectivo = pagos.filter(p => p.metodo !== 'EFECTIVO').reduce((s, p) => s + (p.monto || 0), 0);
    const enEfectivo = totalFinal - noEfectivo;
    const redondeo = redondeoEfectivo(enEfectivo);
    // Si el redondeo se comería TODA la parte en efectivo (p. ej. faltan S/0.07), no se aplica: la fila
    // de efectivo quedaría en 0, no viajaría en el request y el servidor rechazaría por pago incompleto.
    return enEfectivo - redondeo > 0.004 ? redondeo : 0;
}
