import { AbrirCajaRequest } from '../../services/cajas.service';

/** Contado/digitado - saldo del sistema, redondeado a centavos para no pintar 0.1+0.2. */
export function diferenciaMonto(digitado: number | null | undefined, saldoSistema: number | null | undefined): number | null {
    return digitado == null ? null : Math.round((digitado - (saldoSistema ?? 0)) * 100) / 100;
}

/** Texto del arqueo: cuadra / sobrante / faltante. */
export function textoDiferenciaCierre(diferencia: number | null | undefined): string {
    if (diferencia == null || diferencia === 0) return 'la caja cuadra';
    return diferencia > 0 ? 'sobrante' : 'faltante';
}

/**
 * Body de /abrir. Un monto distinto al saldo de cierre es un ajuste de fondo: el backend lo rechaza con 409
 * salvo que viaje `confirmarAjuste=true`, y sólo se manda true cuando el usuario ya lo confirmó.
 */
export function construirAbrirRequest(
    saldoInicial: number, saldoCaja: number | null | undefined, ajusteConfirmado: boolean
): AbrirCajaRequest {
    const hayAjuste = diferenciaMonto(saldoInicial, saldoCaja) !== 0;
    return { saldoInicial, confirmarAjuste: hayAjuste && ajusteConfirmado };
}
