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
        codigoCupon: v.codigoCupon || undefined,
        limiteUsos: v.limiteUsos ?? undefined,
        fechaInicio: v.fechaInicio!,
        fechaFin: v.fechaFin!,
        activo: v.activo ?? true,
    };
}
