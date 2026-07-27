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
    | 'IN_TRANSIT_TO_WAREHOUSE'
    | 'RECEIVED'
    | 'INSPECTED'
    | 'REFUNDED'
    | 'CANCELLED';

// NOTA (2026-07-27): GET /logistics/api/returns ahora devuelve Page<ReturnRequestResponse>
// (ReturnController.getAllReturnRequests), con filtros server-side de q/status/reason/
// warehouseId/rangos de fecha. La paginación se resuelve enteramente en el backend —
// ver DevolucionService.getDevoluciones() y @core/models/pagination.model#PageResponse.
