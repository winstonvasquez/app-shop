export interface Devolucion {
    id: string;
    orderId: string;
    shipmentId: string;
    customerId?: string;
    status: DevolucionStatus;
    reason: string;
    description?: string;
    refundAmount?: number;
    returnTrackingNumber?: string;
    warehouseId?: string;
    notes?: string;
    requestedAt: string;
    approvedAt?: string;
    approvedBy?: string;
    receivedAt?: string;
    inspectedAt?: string;
    inspectionNotes?: string;
    refundedAt?: string;
    createdAt?: string;
}

export type DevolucionStatus =
    | 'REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'RECEIVED'
    | 'INSPECTED'
    | 'REFUNDED';

export interface DevolucionPage {
    content: Devolucion[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
