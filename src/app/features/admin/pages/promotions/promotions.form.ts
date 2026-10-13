import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Promocion } from '@features/admin/services/promotions.service';

/**
 * Valores crudos del formulario de promoción (`form.getRawValue()`). Todo puede venir `null`
 * porque los controles reactivos sin valor lo son; los `!` del mapeo se apoyan en que el
 * formulario ya se validó antes de llamar.
 */
export interface PromocionFormRaw {
    nombre: string | null;
    descripcion: string | null;
    tipo: string | null;
    valor: number | null;
    alcance: string | null;
    productoId: number | null;
    categoriaId: number | string | null;
    montoMinimo: number | null;
    codigoCupon: string | null;
    limiteUsos: number | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    activo: boolean | null;
}

/** Lo que acepta el endpoint de promociones: `id` y `usosActuales` los lleva el backend. */
export type PromocionRequest = Omit<Promocion, 'id' | 'usosActuales'>;

/**
 * Traduce el formulario de promoción al DTO de microshopventas.
 *
 * Regla de negocio central (V69): **el alcance decide cuál de las tres vinculaciones vale y
 * anula las otras dos**. Producto, categoría y monto mínimo son mutuamente excluyentes, así que
 * los dos que no corresponden al alcance elegido viajan `null` — si no, quedaría en base una
 * promoción de carrito con un productoId residual de un intento anterior y se aplicaría dos
 * veces. El `categoriaId` llega como texto desde el select y se convierte a número.
 *
 * `usosActuales` y `estado` están en el formulario para poder leerlos, pero son derivados y
 * nunca se envían.
 */
export function construirPromocionRequest(v: PromocionFormRaw): PromocionRequest {
    return {
        nombre: v.nombre!,
        descripcion: v.descripcion || undefined,
        tipo: v.tipo as Promocion['tipo'],
        valor: v.valor!,
        alcance: v.alcance as Promocion['alcance'],
        productoId: v.alcance === 'PRODUCTO' ? v.productoId : null,
        categoriaId: v.alcance === 'CATEGORIA' ? (v.categoriaId != null ? Number(v.categoriaId) : null) : null,
        montoMinimo: v.alcance === 'CARRITO' ? v.montoMinimo : null,
        // El backend busca el cupón en mayúsculas (PromocionApplicationService): se guarda igual.
        codigoCupon: v.codigoCupon?.trim().toUpperCase() || undefined,
        limiteUsos: v.limiteUsos ?? undefined,
        fechaInicio: v.fechaInicio!,
        fechaFin: v.fechaFin!,
        activo: v.activo ?? true,
    };
}

/** Validadores del valor: > 0 siempre (el backend exige @DecimalMin 0.01) y <= 100 si es PORCENTAJE. */
export function validadoresValor(tipo: string | null): ValidatorFn[] {
    const base = [Validators.required, Validators.min(0.01)];
    return tipo === 'PORCENTAJE' ? [...base, Validators.max(100)] : base;
}

/** Validador de grupo: la fecha de fin no puede ser anterior a la de inicio (ISO yyyy-MM-dd compara como texto). */
export function validarRangoFechas(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('fechaInicio')?.value as string | null;
    const fin = group.get('fechaFin')?.value as string | null;
    return inicio && fin && fin < inicio ? { rangoFechas: true } : null;
}

export const MENSAJE_RANGO_FECHAS = 'La fecha de fin no puede ser anterior a la de inicio.';

/** `new Date('yyyy-MM-dd')` es UTC (en Lima, el día anterior a las 19:00): se parsea como fecha local. */
export function parseFechaLocal(fecha: string): Date {
    return new Date(fecha.slice(0, 10) + 'T00:00:00');
}

/** Hoy en la zona local como yyyy-MM-dd (`toISOString` daría el día siguiente por la noche en Lima). */
export function hoyLocalISO(hoy: Date = new Date()): string {
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mm}-${dd}`;
}

/** Misma regla que el backend: una promoción vence DESPUÉS de su fechaFin (vigente todo ese día). */
export function calcularEstadoPromocion(
    p: { activo: boolean; fechaFin?: string | null },
    hoy: Date = new Date(),
): 'ACTIVA' | 'INACTIVA' | 'VENCIDA' {
    if (!p.activo) return 'INACTIVA';
    return p.fechaFin && p.fechaFin.slice(0, 10) < hoyLocalISO(hoy) ? 'VENCIDA' : 'ACTIVA';
}
