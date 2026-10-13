import { AsientoRecurrenteRequest, RecurringLineItem } from '../../services/asiento-recurrente.service';

/** Valores crudos de `form.getRawValue()`: todos los controles son nullables. */
export interface ValoresFormularioRecurrente {
    nombre?: string | null;
    descripcion?: string | null;
    frecuencia?: string | null;
    diaEjecucion?: number | string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    glosa?: string | null;
}

/** Una fila del FormArray de líneas, sin tipar (el FormArray es dinámico). */
export interface LineaRecurrenteRaw {
    accountCode: unknown;
    movementType: unknown;
    amount: unknown;
}

/**
 * Líneas de la plantilla recurrente. El importe se numeriza porque el input lo entrega
 * como texto y el backend lo recibe como BigDecimal; el tipo de movimiento se toma tal
 * cual (el select sólo ofrece DEBE y HABER, y el balance ya lo validó el formulario).
 */
export function construirLineasRecurrentes(lineas: readonly LineaRecurrenteRaw[]): RecurringLineItem[] {
    return lineas.map(l => ({
        accountCode: l.accountCode as string,
        movementType: l.movementType as 'DEBE' | 'HABER',
        amount: Number(l.amount),
    }));
}

/**
 * Plantilla de asiento recurrente que se envía al backend. Sirve para el alta y para la
 * edición: el PUT reemplaza la plantilla completa, líneas incluidas.
 *
 * `endDate` usa `||` y no `??` a propósito: el input de fecha vacío entrega `''`, y una
 * cadena vacía NO es una fecha de fin sino su ausencia — una plantilla sin fin se envía
 * con `null` (vigencia indefinida). El resto de campos cae a su default del formulario:
 * frecuencia MENSUAL y día 1, que son los del alta.
 */
export function construirAsientoRecurrenteRequest(
    v: ValoresFormularioRecurrente,
    lineas: readonly LineaRecurrenteRaw[],
): AsientoRecurrenteRequest {
    return {
        name: v.nombre ?? '',
        description: v.descripcion ?? '',
        frequency: v.frecuencia ?? 'MENSUAL',
        executionDay: Number(v.diaEjecucion ?? 1),
        startDate: v.fechaInicio ?? '',
        endDate: v.fechaFin || null,
        templateGloss: v.glosa ?? '',
        templateLines: construirLineasRecurrentes(lineas),
    };
}
