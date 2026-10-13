import { Payroll, PayrollRequest } from '../../models/payroll.model';

/** `getRawValue()` del drawer de boleta. */
export interface ValoresFormularioBoleta {
    employeeId: number | null;
    periodo: string | null;
    sueldoBase: number | null;
    bonos: number | null;
    descuentos: number | null;
    asignacionFamiliar: number | null;
    montoHorasExtras: number | null;
    diasTrabajados: number | null;
}

/**
 * Arma el cuerpo del alta/corrección de una boleta.
 *
 * Los tres obligatorios (`@NotNull`/`@NotBlank` en PayrollRequestDto) se afirman no-nulos
 * porque el formulario ya pasó sus `Validators.required`. Los cinco importes opcionales
 * están en `null` mientras el usuario no los teclea y el backend espera su AUSENCIA, no un
 * null explícito.
 *
 * Cuidado con el 0: es un importe LEGÍTIMO (un mes sin bonos, un descuento anulado, un
 * empleado con 0 días trabajados) y por eso la conversión usa `??` y no `||` — con `||` un
 * descuento puesto a 0 a propósito desaparecería del cuerpo y el backend recalcularía la
 * boleta con el valor que tuviera antes.
 */
export function boletaRequestDesdeForm(valores: ValoresFormularioBoleta): PayrollRequest {
    return {
        employeeId: valores.employeeId!,
        periodo: valores.periodo!,
        sueldoBase: valores.sueldoBase!,
        bonos: valores.bonos ?? undefined,
        descuentos: valores.descuentos ?? undefined,
        asignacionFamiliar: valores.asignacionFamiliar ?? undefined,
        montoHorasExtras: valores.montoHorasExtras ?? undefined,
        diasTrabajados: valores.diasTrabajados ?? undefined,
    };
}

/**
 * Precarga el drawer con una boleta ya persistida ("Corregir").
 *
 * Los importes que el backend no devolvió vuelven a `null`, que es el estado "vacío" de un
 * control numérico. `diasTrabajados` es la excepción: cae a 30, el mes comercial peruano
 * que asume el motor de planilla cuando la boleta no lo declara.
 */
export function formularioDesdeBoleta(boleta: Payroll): ValoresFormularioBoleta {
    return {
        employeeId: boleta.employeeId,
        periodo: boleta.periodo,
        sueldoBase: boleta.sueldoBase,
        bonos: boleta.bonos ?? null,
        descuentos: boleta.descuentos ?? null,
        asignacionFamiliar: boleta.asignacionFamiliar ?? null,
        montoHorasExtras: boleta.montoHorasExtras ?? null,
        diasTrabajados: boleta.diasTrabajados ?? 30,
    };
}
