import { DireccionEnvio, OrderRequest } from '@core/models/order.model';
import { Address } from '@core/services/address/address.service';
import { CartItem } from '@features/cart/services/cart.service';

/**
 * Instantánea del checkout en el instante de confirmar. Son los mismos valores que exponen las
 * señales del componente, pero como datos planos: así la regla de armado del pedido no depende
 * de Angular y se puede probar sin TestBed.
 */
export interface DatosDelCheckout {
    /** `null` cuando no hay sesión iniciada (compra como invitado). */
    usuarioId: number | null;
    esInvitado: boolean;
    /** Valor crudo del control `guestEmail`; sólo se usa si `esInvitado`. */
    emailInvitado: string | null | undefined;
    items: readonly CartItem[];
    direccion: Address;
    metodoPago: string;
    codigoCupon: string | null;
    zonaEnvioId: number | null | undefined;
}

/**
 * Traduce el estado del checkout al pedido que espera `POST /api/pedidos`.
 *
 * Las reglas de negocio que codifica:
 *
 * - **El email de invitado sólo viaja si NO hay sesión.** Con usuario logueado el pedido se
 *   identifica por `usuarioId` y `guestEmail` tiene que ir ausente, aunque el formulario de
 *   invitado conserve un valor de una visita anterior.
 * - **Una línea sin variante viaja como variante 0**, que es el centinela que el backend
 *   entiende por «el producto base, sin talla ni color».
 * - **La dirección se rellena con los valores que el backend exige no nulos**: ubigeo por
 *   defecto `'00000'` (el backend valida el formato de 5 dígitos) y destinatario/teléfono
 *   como cadena vacía. Sólo se sustituye el `null`/ausente: un ubigeo de cadena vacía se
 *   respeta tal cual, igual que hacía el componente.
 * - **Cupón y zona de envío se omiten en vez de viajar nulos**: el backend distingue «no
 *   informado» de «informado en nulo», y un nulo explícito activa validaciones que no
 *   corresponden.
 *
 * OJO (comportamiento preexistente, conservado a propósito): viajan TODOS los ítems del
 * carrito, incluidos los que el usuario deseleccionó, mientras que el total cobrado
 * (`cartTotal`) sólo suma los seleccionados. Ver `observaciones` de la ola.
 */
export function construirOrderRequest(datos: DatosDelCheckout): OrderRequest {
    return {
        usuarioId: datos.usuarioId,
        guestEmail: datos.esInvitado ? (datos.emailInvitado ?? undefined) : undefined,
        detalles: datos.items.map(item => ({
            productoId: item.productId,
            varianteId: item.variantId ?? 0,
            cantidad: item.quantity,
        })),
        direccionEnvio: direccionDeEnvio(datos.direccion),
        metodoPago: datos.metodoPago,
        codigoCupon: datos.codigoCupon ?? undefined,
        zonaEnvioId: datos.zonaEnvioId ?? undefined,
    };
}

/**
 * Rellena los campos que el backend exige no nulos. Sólo sustituye el `null`/ausente: un ubigeo
 * de cadena vacía se respeta tal cual, igual que hacía el componente.
 */
function direccionDeEnvio(direccion: Address): DireccionEnvio {
    return {
        direccion: direccion.direccion,
        ciudad: direccion.distrito,
        codigoPostal: direccion.ubigeo ?? '00000',
        pais: 'Perú',
        region: direccion.departamento,
        nombreDestinatario: direccion.nombreDestinatario ?? '',
        telefono: direccion.telefonoDestinatario ?? '',
    };
}
