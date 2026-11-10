export interface OrderResponse {
    id: number;
    usuarioId: number;
    userId: number; // Alias para compatibilidad
    total: number;
    estado: string;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    fechaPedido: string; // Fecha del pedido
    detalles?: OrderDetail[];
    direccionEnvio?: DireccionEnvio;
    metodoPago?: string;
    /** Correo del comprador invitado (el pedido de invitado no trae usuarioId). */
    guestEmail?: string;
    descuentoTotal?: number;
    costoEnvio?: number;
    codigoCupon?: string;
    /** Estado del pago (PagoEntity.EstadoPago). */
    estadoPago?: string;
    /** N.º de operación del pago (pago.referenciaTransaccion); null si no hay. */
    referenciaPago?: string | null;
    /** Comprobante SUNAT del pedido; null/ausente = aún sin comprobante. */
    cpeTipo?: 'BOLETA' | 'FACTURA' | null;
    cpeSerie?: string | null;
    cpeNumero?: string | null;
    cpeEstado?: 'PENDIENTE' | 'EMITIDO' | 'ERROR' | null;
    cpeFechaEmision?: string | null;
}

export interface OrderDetail {
    id: number;
    productoId: number;
    varianteId?: number; // ID de la variante (talla/color) — usado al "Volver a comprar"
    productoNombre: string; // Nombre del producto
    varianteNombre?: string; // Nombre de la variante
    sku: string; // SKU del producto
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface DireccionEnvio {
    direccion: string;
    ciudad: string;
    codigoPostal?: string;
    pais?: string;
    region?: string;
    nombreDestinatario?: string;
    telefono?: string;
    /** «Frente al parque…» (máx. 200): lo que permite al courier entregar. */
    referencia?: string;
    /** Máx. 100. */
    provincia?: string;
}

export interface OrderRequest {
    usuarioId: number | null;
    guestEmail?: string;
    detalles: OrderDetailRequest[];
    direccionEnvio: DireccionEnvio;
    metodoPago: string;
    codigoCupon?: string;
    zonaEnvioId?: number;
    /** BOLETA | FACTURA; ausente = BOLETA. */
    tipoComprobante?: 'BOLETA' | 'FACTURA';
    /** Catálogo 06 SUNAT: 1=DNI, 4=CE, 6=RUC, 7=Pasaporte. */
    tipoDocCliente?: string;
    numDocCliente?: string;
    /** Obligatoria en FACTURA. */
    razonSocial?: string;
}

/** Respuesta de confirmación de pago en el backend. */
export interface PaymentConfirmResponse {
    orderId: number;
    estado: string;
    referenciaPago: string;
}

/** Respuesta de cancelación de pedido en el backend. */
export interface OrderCancelResponse {
    orderId: number;
    estado: string;
    motivo: string;
}

export interface OrderDetailRequest {
    productoId: number;
    varianteId: number;
    cantidad: number;
}

export interface OrderStatusUpdate {
    estado: string;
    /** Nombre real del campo en `PedidoEstadoUpdateDto` (antes «observaciones», que el backend ignoraba). */
    observacion?: string;
    /** N.º de operación del cobro manual (PUT estado=PAGADO); obligatorio para transferencia/Yape/Plin. */
    referenciaPago?: string;
}
