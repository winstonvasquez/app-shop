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
 * Si un descuento de línea excede lo que el cajero puede aprobar por su cuenta, hace falta el PIN
 * de un supervisor.
 *
 * El techo se expresa siempre en porcentaje del bruto de la línea, así que un descuento en soles
 * se convierte antes de comparar: rebajar S/ 5 de una línea de S/ 200 es 2,5 % y pasa; los mismos
 * S/ 5 sobre una línea de S/ 20 son 25 % y no.
 *
 * Los dos casos degenerados exigen autorización, por prudencia y no por descuido: si la línea no
 * está en el carrito no hay bruto contra el que medir, y si el bruto es 0 cualquier importe es
 * infinitamente mayor que él.
 */
export function requiereAutorizacionSupervisor(
    tipo: DescuentoTipo,
    valor: number,
    item: CartItem | undefined,
    maxPorcentajeSinAuth: number,
): boolean {
    if (tipo === 'PORCENTAJE') return valor > maxPorcentajeSinAuth;
    if (!item) return true;

    const bruto = item.cantidad * item.variante.precioFinal;
    const porcentajeEquivalente = bruto > 0 ? (valor / bruto) * 100 : 100;
    return porcentajeEquivalente > maxPorcentajeSinAuth;
}
