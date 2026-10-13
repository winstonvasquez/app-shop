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
    clienteTipoDoc: string;
    clienteNumeroDoc: string;
    /** La gift card aplicada paga toda la venta (no queda resto que cobrar). */
    giftCardCubreTodo: boolean;
    descuento: number;
    montoRecibido: number;
    /** Token de supervisor a enviar; la página lo pasa sólo si el descuento de la venta lo exige. */
    autorizacionToken?: string;
}

/**
 * Traduce el carrito del cajero al pedido que espera `POST /api/pos/ventas`.
 *
 * Las reglas de negocio que codifica, todas ellas «lo que el backend NO debe recibir»:
 *
 * - **Omitir lo que vale su valor por defecto.** Un descuento de 0, un cliente sin nombre o
 *   0 bolsas viajan como `undefined` y no como 0/''. El backend distingue «no informado» de
 *   «informado en cero», y un 0 explícito activa validaciones que no corresponden.
 * - **La gift card es un PAGO, no un método que reemplaza al resto.** El código viaja siempre
 *   que haya gift card. Sólo si cubre toda la venta el método es `GIFT_CARD` (y no viaja
 *   monto recibido ni pagos); si queda resto, `metodoPago`/`montoRecibido`/`pagos` se refieren
 *   al RESTO y el método es el del cajero, nunca `GIFT_CARD`.
 * - **En pago dividido el monto recibido es la suma de los pagos**, no lo que el cajero tecleó
 *   en el campo de efectivo; y sólo viajan los pagos con monto > 0 (las filas vacías del
 *   formulario de pago mixto no son pagos).
 * - **`autorizadoPor` conserva el 0 y descarta sólo el null**: el id del supervisor que autorizó
 *   un descuento es un dato, no un valor por defecto — por eso `??` y no `||`. (El servidor ya lo
 *   ignora y lo fija él a partir del token; se sigue enviando por compatibilidad.)
 * - **`autorizacionToken`** viaja a nivel de venta, sólo si la página lo da.
 */
export function construirVentaPosRequest(carrito: CarritoParaVenta): VentaPosRequest {
    const pagoDividido = carrito.pagoDividido;
    const montoTotalPagos = pagoDividido
        ? carrito.pagos.reduce((suma, p) => suma + p.monto, 0)
        : undefined;

    const giftCardCodigo = carrito.giftCardCodigo || undefined;
    const soloGiftCard = giftCardCodigo !== undefined && carrito.giftCardCubreTodo;

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
        metodoPago: soloGiftCard ? 'GIFT_CARD' : carrito.metodoPagoPrimario,
        tipoCpe: carrito.tipoCpe,
        clienteId: carrito.clienteId ?? undefined,
        clienteNombre: carrito.clienteNombre || undefined,
        clienteTipoDoc: carrito.clienteTipoDoc || undefined,
        clienteNumeroDoc: carrito.clienteNumeroDoc || undefined,
        giftCardCodigo,
        descuento: carrito.descuento || undefined,
        montoRecibido: soloGiftCard ? undefined : (pagoDividido ? montoTotalPagos : (carrito.montoRecibido || undefined)),
        pagos: pagoDividido && !soloGiftCard ? carrito.pagos.filter(p => p.monto > 0) : undefined,
        autorizacionToken: carrito.autorizacionToken || undefined,
    };
}

/** Tipo de documento del cliente (RUC/DNI/otro) → código SUNAT: '6' RUC, '1' DNI, '0' sin documento. */
export function tipoDocSunat(tipoDocumento: string | null | undefined): string {
    switch ((tipoDocumento ?? '').trim().toUpperCase()) {
        case 'RUC': case '6': return '6';
        case 'DNI': case '1': return '1';
        default: return '0';
    }
}

/** Mensaje de bloqueo si la FACTURA no tiene cliente con RUC de 11 dígitos; null si se puede cobrar. */
export function errorFacturaSinRuc(
    tipoCpe: TipoCpe, clienteTipoDoc: string, clienteNumeroDoc: string,
): string | null {
    if (tipoCpe !== 'FACTURA') return null;
    return clienteTipoDoc === '6' && /^\d{11}$/.test(clienteNumeroDoc)
        ? null
        : 'Para emitir factura selecciona un cliente con RUC';
}
