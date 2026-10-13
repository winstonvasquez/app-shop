import { PaymentRequest } from '../../models/tesoreria.model';
import { MONEDA } from '@shared/constants/sunat.constants';

/**
 * Forma cruda de `pagoForm.value`. El FormGroup es dinámico (`FormGroup` sin tipar), así
 * que este contrato declara lo que el formulario garantiza DESPUÉS de validar: los campos
 * con `Validators.required` llegan con valor, y solo dos pueden faltar de verdad.
 */
export interface ValoresFormularioPago {
    tipoPago: string;
    monto: number;
    metodoPago: string;
    fechaSolicitud: string;
    beneficiarioNombre: string;
    concepto: string;
    /** Opcional en el formulario: no siempre se conoce el DNI/RUC del beneficiario. */
    beneficiarioDocumento?: string | null;
    /** Cuenta de la que sale el dinero. Se limpia a null cada vez que cambia la moneda. */
    bankAccountId?: number | null;
    /** Tiene default en el alta, pero `reset()` puede dejarlo nulo. */
    moneda?: string | null;
}

/**
 * Traduce el formulario a la solicitud de pago de tesorería.
 *
 * `moneda` cae a PEN: un pago sin moneda deja el monto sin significado y todos los
 * totales de la pantalla están separados por moneda (ver totalComprometidoPEN/USD).
 *
 * `beneficiarioDocumento` viaja como cadena vacía y no ausente porque el backend lo
 * declara obligatorio en el DTO aunque el formulario no lo exija: no siempre se conoce
 * el DNI/RUC de quien cobra.
 *
 * `bankAccountId` sí viaja AUSENTE cuando no se eligió cuenta — un pago puede
 * registrarse sin decidir todavía de qué cuenta sale, y mandar null lo rompería.
 *
 * El `tenantId` entra por parámetro: sale del JWT, no del formulario.
 */
export function construirPaymentRequest(v: ValoresFormularioPago, tenantId: number): PaymentRequest {
    return {
        tenantId,
        tipoPago: v.tipoPago,
        monto: v.monto,
        moneda: v.moneda ?? MONEDA.PEN,
        metodoPago: v.metodoPago,
        fechaSolicitud: v.fechaSolicitud,
        beneficiarioNombre: v.beneficiarioNombre,
        beneficiarioDocumento: v.beneficiarioDocumento ?? '',
        concepto: v.concepto,
        bankAccountId: v.bankAccountId ?? undefined,
    };
}
