import { CartItem } from '../../models/catalogo-pos.model';
import { MetodoPagoPos, PagoMixto, TipoCpe, VentaPosRequest } from '../../models/venta-pos.model';

/**
 * Instantánea del carrito en el instante de cobrar. Son los mismos valores que exponen las
 * señales de `PosCarritoService`, pero como datos planos: así la regla de armado del pedido
 * no depende de Angular y se puede probar sin TestBed.
 */
export interface CarritoParaVenta {
    turnoCajaId: number;
    items: readonly CartItem[];
    pagoDividido: boolean;
    pagos: readonly PagoMixto[];
    giftCardCodigo: string;
    metodoPagoPrimario: MetodoPagoPos;
    tipoCpe: TipoCpe;
    clienteId: number | null;
    clienteNombre: string;
    descuento: number;
    montoRecibido: number;
}

/**
 * Traduce el carrito del cajero al pedido que espera `POST /api/pos/ventas`.
 *
 * Las reglas de negocio que codifica, todas ellas «lo que el backend NO debe recibir»:
 *
 * - **Omitir lo que vale su valor por defecto.** Un descuento de 0, un cliente sin nombre o
 *   0 bolsas viajan como `undefined` y no como 0/''. El backend distingue «no informado» de
 *   «informado en cero», y un 0 explícito activa validaciones que no corresponden.
 * - **La gift card manda sobre el método de pago.** Si hay código de gift card, el método es
 *   `GIFT_CARD` sea cual sea el que eligió el cajero.
 * - **En pago dividido el monto recibido es la suma de los pagos**, no lo que el cajero tecleó
 *   en el campo de efectivo; y sólo viajan los pagos con monto > 0 (las filas vacías del
 *   formulario de pago mixto no son pagos).
 * - **`autorizadoPor` conserva el 0 y descarta sólo el null**: el id del supervisor que autorizó
 *   un descuento es un dato, no un valor por defecto — por eso `??` y no `||`.
 */
export function construirVentaPosRequest(carrito: CarritoParaVenta): VentaPosRequest {
    const pagoDividido = carrito.pagoDividido;
    const montoTotalPagos = pagoDividido
        ? carrito.pagos.reduce((suma, p) => suma + p.monto, 0)
        : undefined;

    const giftCardCodigo = carrito.giftCardCodigo || undefined;

    return {
        turnoCajaId: carrito.turnoCajaId,
        items: carrito.items.map(i => ({
            varianteId: i.variante.varianteId,
            cantidad: i.cantidad,
            descuentoTipo: i.descuentoTipo !== 'NINGUNO' ? i.descuentoTipo : undefined,
            descuentoValor: i.descuentoValor > 0 ? i.descuentoValor : undefined,
            autorizadoPor: i.autorizadoPor ?? undefined,
            bolsas: i.bolsas > 0 ? i.bolsas : undefined,
        })),
        metodoPago: giftCardCodigo ? 'GIFT_CARD' : carrito.metodoPagoPrimario,
        tipoCpe: carrito.tipoCpe,
        clienteId: carrito.clienteId ?? undefined,
        clienteNombre: carrito.clienteNombre || undefined,
        descuento: carrito.descuento || undefined,
        montoRecibido: pagoDividido ? montoTotalPagos : (carrito.montoRecibido || undefined),
        pagos: pagoDividido ? carrito.pagos.filter(p => p.monto > 0) : undefined,
    };
}
