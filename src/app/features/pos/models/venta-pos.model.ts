// models/venta-pos.model.ts

export type MetodoPagoPos = 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'MIXTO' | 'GIFT_CARD';

export interface GiftCard {
    id: number;
    companyId: number;
    codigo: string;
    saldoInicial: number;
    saldoActual: number;
    moneda: string;
    estado: string;
    fechaExpiracion?: string;
    clienteId?: number;
    clienteNombre?: string;
    fechaCreacion: string;
}

export interface PagoMixto {
    // El backend rechaza GIFT_CARD y MIXTO dentro de pagos[] (400).
    metodo: Exclude<MetodoPagoPos, 'MIXTO' | 'GIFT_CARD'>;
    monto: number;
}
/** Método de una línea de pago dividido (el backend no admite MIXTO ni GIFT_CARD ahí). */
export type MetodoPagoDividido = PagoMixto['metodo'];
export type TipoCpe = 'BOLETA' | 'FACTURA' | 'SIN_CPE';
export type EstadoVentaPos = 'COMPLETADA' | 'ANULADA';

export interface DetalleVentaPosResponse {
    id: number;
    varianteId: number;
    varianteSku: string;
    varianteNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotalLinea: number;
    descuentoTipo: string;
    descuentoValor: number;
    descuentoMonto: number;
    /** Unidades ya devueltas; sólo viene en el recibo de una venta (no en los listados). */
    cantidadDevuelta?: number | null;
}

export interface PagoMixtoResponse {
    metodo: string;
    monto: number;
}

export interface VentaPosResponse {
    id: number;
    numeroTicket: string;
    tipoCpe: TipoCpe;
    numeroCpe?: string;
    clienteId?: number;
    clienteNombre?: string;
    metodoPago: MetodoPagoPos;
    subtotal: number;
    igv: number;
    descuento: number;
    total: number;
    totalIcbper: number;
    montoRecibido?: number;
    vuelto: number;
    estado: EstadoVentaPos;
    fechaCreacion: string;
    cajeroId: number;
    cajeroNombre: string;
    turnoId: number;
    detalles: DetalleVentaPosResponse[];
    pagos: PagoMixtoResponse[];
    qrData?: string;
    moneda?: string;
    tipoCambio?: number;
    totalMonedaExtranjera?: number;
    /** Nota de crédito emitida al anular una venta con BOLETA/FACTURA; null si no hubo (o no está anulada). */
    numeroNcAnulacion?: string | null;
}

export interface VentaPosItemRequest {
    varianteId: number;
    cantidad: number;
    descuentoTipo?: string;
    descuentoValor?: number;
    autorizadoPor?: number;
    bolsas?: number;
}

export interface VentaPosRequest {
    turnoCajaId: number;
    items: VentaPosItemRequest[];
    metodoPago: MetodoPagoPos;
    tipoCpe: TipoCpe;
    clienteId?: number;
    clienteNombre?: string;
    /** Código SUNAT: '6' RUC, '1' DNI, '0' sin documento. FACTURA exige '6' + 11 dígitos. */
    clienteTipoDoc?: string;
    clienteNumeroDoc?: string;
    descuento?: number;
    /** Con gift card, referido al RESTO que queda tras aplicarla. */
    montoRecibido?: number;
    pagos?: PagoMixto[];
    /** La gift card es un pago: el backend consume min(saldo, total). */
    giftCardCodigo?: string;
    moneda?: string;
    puntosACanjear?: number;
    /**
     * Token de supervisor (`POST /api/pos/autorizaciones`, acción DESCUENTO). El servidor lo exige
     * cuando el mayor % de descuento de la venta supera el tope de la empresa; es de un solo uso.
     */
    autorizacionToken?: string;
}

// ── Tipo de Cambio ─────────────────────────────────────────────

export interface TipoCambio {
    id: number;
    companyId: number;
    monedaOrigen: string;
    monedaDestino: string;
    tasaCompra: number;
    tasaVenta: number;
    fechaVigencia: string;
    fuente: string;
}

// ── Devoluciones ────────────────────────────────────────────────

export interface DevolucionPosRequest {
    motivo: string;
    observaciones?: string;
    lineas: { detalleVentaPosId: number; cantidadDevuelta: number }[];
}

export interface DevolucionPosResponse {
    id: number;
    ventaPosId: number;
    numeroNc: string;
    motivo: string;
    observaciones?: string;
    totalDevuelto: number;
    estado: string;
    fechaCreacion: string;
    lineas: {
        detalleVentaPosId: number;
        sku: string;
        nombreProducto: string;
        cantidadDevuelta: number;
        montoDevuelto: number;
    }[];
}

// ── Sucursales ──────────────────────────────────────────────────

export interface Sucursal {
    id: number;
    companyId: number;
    nombre: string;
    direccion?: string;
    ubigeo?: string;
    telefono?: string;
    serieBoleta?: string;
    serieFactura?: string;
    almacenId?: number;
    activo: boolean;
}
