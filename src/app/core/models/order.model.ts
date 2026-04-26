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
}

export interface OrderDetail {
    id: number;
    productoId: number;
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
}

export interface OrderRequest {
    usuarioId: number | null;
    guestEmail?: string;
    detalles: OrderDetailRequest[];
    direccionEnvio: DireccionEnvio;
    metodoPago: string;
    codigoCupon?: string;
    zonaEnvioId?: number;
    /** Estado inicial del pedido. Usar 'PENDIENTE_PAGO' cuando el gateway se llama después de crear el pedido. */
    estado?: string;
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
    observaciones?: string;
}
