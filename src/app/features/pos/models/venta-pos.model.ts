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
    montoRecibido?: number;
    vuelto: number;
    estado: EstadoVentaPos;
    fechaCreacion: string;
    cajeroId: number;
    cajeroNombre: string;
    turnoId: number;
    detalles: DetalleVentaPosResponse[];
}

export interface VentaPosItemRequest {
    varianteId: number;
    cantidad: number;
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
