export interface Envio {
    id: string;
    orderId?: string;
    trackingNumber: string;
    status: EnvioStatus;
    shippingAddress: string;
    recipientName: string;
    recipientPhone?: string;
    recipientEmail?: string;
    shippingCost?: number;
    carrierId?: string;
    carrierNombre?: string;
    dispatchedAt?: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
    notes?: string;
    createdAt: string;
    trackingEvents?: TrackingEvent[];
}

export type EnvioStatus =
    | 'PENDING_DISPATCH'
    | 'DISPATCHED'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED_DELIVERY'
    | 'RETURNED'
    | 'CANCELLED';

export interface TrackingEvent {
    id?: string;
    status: string;
    location: string;
    description: string;
    timestamp: string;
}

export interface EnvioPage {
    content: Envio[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateEnvioDto {
    /** Obligatorio en el backend (CreateShipmentRequest): packing en READY_TO_SHIP. */
    packingOrderId: string;
    orderId?: string;
    carrierId: string;
    shippingAddress: string;
    recipientName: string;
    recipientPhone?: string;
    recipientEmail?: string;
    shippingCost?: number;
    estimatedDeliveryDate?: string;
    notes?: string;
    tenantId: string;
    companyId: string;
}
