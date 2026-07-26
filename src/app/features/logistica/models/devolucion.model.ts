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

// NOTA (2026-07-26): GET /logistics/api/returns devuelve una List<ReturnRequestResponse>
// plana (ReturnController.getAllReturnRequests), NO un Page paginado — el backend no pagina
// este listado hoy. La paginación de la tabla se resuelve client-side en
// DevolucionesPageComponent sobre este arreglo. Si se agrega paginación real en backend,
// reintroducir un tipo `DevolucionPage` y volver a getDevoluciones(): Observable<DevolucionPage>.
