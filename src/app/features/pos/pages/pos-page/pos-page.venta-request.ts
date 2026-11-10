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
    /** N.º de operación del pago digital simple (se ignora en pago dividido, donde va por línea). */
    referenciaOperacion?: string;
}

/** Medios con comprobante conciliable: sólo ellos llevan N.º de operación (en EFECTIVO/GIFT_CARD/MIXTO no aplica). */
const METODOS_DIGITALES: readonly string[] = ['TARJETA', 'YAPE', 'PLIN'];

/** Referencia limpia para enviar, o undefined si el medio no es digital o quedó en blanco. */
function referenciaDigital(metodo: string, referencia: string | undefined): string | undefined {
    const r = referencia?.trim();
    return r && METODOS_DIGITALES.includes(metodo) ? r : undefined;
}

/** Mismo formato que valida el backend: ≤40 caracteres de `[A-Za-z0-9 ._/#-]`. Null si es válida o vacía. */
export function errorReferenciaOperacion(referencia: string | undefined): string | null {
    const r = referencia?.trim();
    if (!r) return null;
    return /^[A-Za-z0-9 ._/#-]{1,40}$/.test(r)
        ? null
        : 'El N.º de operación admite hasta 40 letras, números y . _ / # -';
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
    const metodoPago: MetodoPagoPos = soloGiftCard ? 'GIFT_CARD' : carrito.metodoPagoPrimario;

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
        metodoPago,
        tipoCpe: carrito.tipoCpe,
        clienteId: carrito.clienteId ?? undefined,
        clienteNombre: carrito.clienteNombre || undefined,
        clienteTipoDoc: carrito.clienteTipoDoc || undefined,
        clienteNumeroDoc: carrito.clienteNumeroDoc || undefined,
        giftCardCodigo,
        descuento: carrito.descuento || undefined,
        montoRecibido: soloGiftCard ? undefined : (pagoDividido ? montoTotalPagos : (carrito.montoRecibido || undefined)),
        pagos: pagoDividido && !soloGiftCard
            ? carrito.pagos.filter(p => p.monto > 0).map(p => ({ ...p, referencia: referenciaDigital(p.metodo, p.referencia) }))
            : undefined,
        referenciaOperacion: pagoDividido ? undefined : referenciaDigital(metodoPago, carrito.referenciaOperacion),
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

/**
 * Umbral de identificación de la boleta (S/). Espejo del default del backend (BOLETA_MONTO_IDENTIFICACION):
 * el servidor sigue siendo quien decide; esto sólo evita cobrar para recibir el 400 después.
 */
export const BOLETA_MONTO_IDENTIFICACION = 700;

/** Mismo criterio de documento válido que el backend: DNI 8 dígitos no ceros, RUC 11 dígitos, CE/pasaporte no vacío. */
function documentoAdquirenteValido(tipoDoc: string, numero: string): boolean {
    const n = numero.trim();
    switch (tipoDoc) {
        case '1': return /^\d{8}$/.test(n) && !/^0+$/.test(n);
        case '6': return /^\d{11}$/.test(n);
        case '4': case '7': return n.length > 0;
        default: return false;
    }
}

/** Boleta por más de S/700 sin adquirente identificado: mensaje de bloqueo ANTES de cobrar; null si se puede. */
export function errorBoletaSinIdentificar(
    tipoCpe: TipoCpe, total: number, clienteTipoDoc: string, clienteNumeroDoc: string,
): string | null {
    if (tipoCpe !== 'BOLETA' || total <= BOLETA_MONTO_IDENTIFICACION) return null;
    return documentoAdquirenteValido(clienteTipoDoc, clienteNumeroDoc)
        ? null
        : `La boleta por más de S/${BOLETA_MONTO_IDENTIFICACION} requiere identificar al cliente (DNI, CE, pasaporte o RUC válido)`;
}

const TOLERANCIA_EFECTIVO = 0.01;

/** Efectivo informado que no alcanza el total a cubrir; null si no hay monto informado, no es efectivo o alcanza. */
export function errorEfectivoInsuficiente(
    metodo: MetodoPagoPos, pagoDividido: boolean, montoRecibido: number, total: number,
): string | null {
    if (pagoDividido || metodo !== 'EFECTIVO' || !(montoRecibido > 0)) return null;
    return montoRecibido < total - TOLERANCIA_EFECTIVO
        ? `El efectivo recibido (S/${montoRecibido.toFixed(2)}) no cubre el total (S/${total.toFixed(2)})`
        : null;
}

/** Resultado del arqueo para el aviso de cierre: contado − esperado (el backend devuelve el esperado en montoCierreReal). */
export function textoDiferenciaArqueo(contado: number, esperado: number | null | undefined): string {
    if (esperado == null) return 'Turno cerrado con arqueo';
    const dif = Math.round((contado - esperado) * 100) / 100;
    if (dif === 0) return 'Turno cerrado: arqueo cuadrado';
    return dif > 0
        ? `Turno cerrado: sobrante de S/${dif.toFixed(2)} (contado S/${contado.toFixed(2)}, esperado S/${esperado.toFixed(2)})`
        : `Turno cerrado: faltante de S/${(-dif).toFixed(2)} (contado S/${contado.toFixed(2)}, esperado S/${esperado.toFixed(2)})`;
}
