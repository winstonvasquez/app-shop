// models/venta-pos.model.ts

export type MetodoPagoPos = 'EFECTIVO' | 'TARJETA' | 'YAPE' | 'PLIN' | 'MIXTO';

export interface PagoMixto {
    metodo: Exclude<MetodoPagoPos, 'MIXTO'>;
    monto: number;
}
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
    descuento?: number;
    montoRecibido?: number;
    pagos?: PagoMixto[];
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
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
