import { CartItem, DescuentoTipo } from '../../models/catalogo-pos.model';

/**
 * Con qué valores se abre el popover de descuento de una línea.
 *
 * Reabrir el popover tiene que mostrar lo que ya está aplicado, para que el cajero corrija en vez
 * de re-teclear. La única traducción es que `NINGUNO` —el estado interno de «sin descuento»— no es
 * una opción elegible en el desplegable: se ofrece PORCENTAJE, que es el caso habitual en caja.
 */
export function estadoInicialDescuento(item: CartItem | undefined): { tipo: DescuentoTipo; valor: number } {
    const tipo = item?.descuentoTipo;
    return {
        tipo: !tipo || tipo === 'NINGUNO' ? 'PORCENTAJE' : tipo,
        valor: item?.descuentoValor ?? 0,
    };
}

/**
 * Descuento de una línea expresado en porcentaje de su bruto (cantidad × precio).
 *
 * El techo se expresa siempre en porcentaje, así que un descuento en soles se convierte antes de
 * comparar: rebajar S/ 5 de una línea de S/ 200 es 2,5 % y pasa; los mismos S/ 5 sobre una línea de
 * S/ 20 son 25 % y no. Es el mismo cálculo que hace el servidor para exigir el token de supervisor.
 *
 * Los dos casos degenerados dan 100 %, por prudencia y no por descuido: si la línea no está en el
 * carrito no hay bruto contra el que medir, y si el bruto es 0 cualquier importe es infinitamente
 * mayor que él.
 */
export function porcentajeEquivalente(
    tipo: DescuentoTipo,
    valor: number,
    item: CartItem | undefined,
): number {
    if (tipo === 'PORCENTAJE') return valor;
    if (!item) return 100;

    const bruto = item.cantidad * item.variante.precioFinal;
    return bruto > 0 ? (valor / bruto) * 100 : 100;
}

/** Descuento global (S/) como porcentaje de la suma de líneas ya con su descuento; 100 si no hay base. */
export function porcentajeDescuentoGlobal(descuento: number, items: readonly CartItem[]): number {
    if (descuento <= 0) return 0;
    const base = items.reduce((suma, i) => suma + i.subtotal, 0);
    return base > 0 ? (descuento / base) * 100 : 100;
}

/**
 * % de descuento TOTAL de la venta (líneas + global) sobre su bruto: lo que el servidor compara contra
 * `max-descuento` para exigir el token. Con el máximo de cada uno, 10 % por línea más 10 % global (19 % real)
 * pasaba sin supervisor.
 */
export function porcentajeDescuentoTotal(items: readonly CartItem[], descuentoGlobal: number): number {
    const bruto = items.reduce((suma, i) => suma + i.cantidad * i.variante.precioFinal, 0);
    const neto = items.reduce((suma, i) => suma + i.subtotal, 0) - Math.max(0, descuentoGlobal);
    const descuentos = bruto - neto;
    if (descuentos <= 0) return 0;
    return bruto > 0 ? (descuentos / bruto) * 100 : 100;
}

/** Porcentaje que se pide autorizar: redondeado hacia ARRIBA a 2 decimales para que el token nunca quede corto. */
export function porcentajeAAutorizar(porcentaje: number): number {
    return Math.ceil(porcentaje * 100) / 100;
}

/** ¿El token de la venta cubre ese porcentaje? Sin token, no. */
export function tokenCubre(autorizacion: { porcentaje: number } | null, porcentaje: number): boolean {
    return autorizacion !== null && autorizacion.porcentaje >= porcentaje;
}

/**
 * ¿Hace falta el PIN de un supervisor para ese descuento? Sólo si supera el tope de la empresa
 * (inclusivo: justo en el tope no pide PIN) y el token ya obtenido para la venta no lo cubre.
 */
export function necesitaAutorizacion(
    porcentaje: number,
    maxSinAuth: number,
    autorizacion: { porcentaje: number } | null,
): boolean {
    return porcentaje > maxSinAuth && !tokenCubre(autorizacion, porcentaje);
}
