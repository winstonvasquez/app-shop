// Alineado a PackingOrderResponse / CreatePackingOrderRequest / PackingStatus del backend.
export type PackingOrderStatus = 'PENDING_PACKING' | 'PACKING' | 'PACKED' | 'READY_TO_SHIP' | 'CANCELLED';

export interface PackingOrder {
    id: string;
    pickingOrderId: string;
    orderId?: string;
    status: PackingOrderStatus;
    packageType?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    assignedTo?: string;
    packedBy?: string;
    packedAt?: string;
    notes?: string;
    createdAt: string;
}

export interface CreatePackingBody {
    pickingOrderId: string;
    packageType?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    notes?: string;
}
