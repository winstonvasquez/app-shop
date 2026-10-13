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

/** Body de `POST /logistics/api/returns` — alineado con `CreateReturnRequest` (Java). */
export interface CreateDevolucionDto {
    orderId: string;
    shipmentId: string;
    reason: string;
    description?: string;
}

/** Condición física de un ítem inspeccionado — espejo de `ItemCondition` (Java). */
export type ItemCondicion = 'BUENO' | 'DANADO' | 'DEFECTUOSO' | 'INCORRECTO';

/** Destino del ítem inspeccionado — espejo de `ItemDisposition` (Java). RESTOCK reingresa stock. */
export type ItemDisposicion = 'RESTOCK' | 'DESECHAR' | 'REPARAR' | 'DEVOLVER_PROVEEDOR';

export const ITEM_CONDICIONES: ReadonlyArray<{ value: ItemCondicion; label: string }> = [
    { value: 'BUENO', label: 'Bueno' },
    { value: 'DANADO', label: 'Dañado' },
    { value: 'DEFECTUOSO', label: 'Defectuoso' },
    { value: 'INCORRECTO', label: 'Incorrecto' },
];

export const ITEM_DISPOSICIONES: ReadonlyArray<{ value: ItemDisposicion; label: string }> = [
    { value: 'RESTOCK', label: 'Reingresar a stock' },
    { value: 'DESECHAR', label: 'Desechar' },
    { value: 'REPARAR', label: 'Reparar' },
    { value: 'DEVOLVER_PROVEEDOR', label: 'Devolver al proveedor' },
];

/** Ítem del body de `POST /returns/{id}/inspection` — `InspectionItemRequest` (Java). */
export interface InspeccionItemDto {
    /** UUID (sintético desde el id Long del producto de ventas). */
    productoId: string;
    sku: string;
    productoNombre: string;
    cantidad: number;
    condition: ItemCondicion;
    disposition: ItemDisposicion;
    notes?: string;
}

/** Body de `POST /returns/{id}/inspection` — `CreateInspectionRequest` (el id del path manda). */
export interface CreateInspeccionDto {
    /** Obligatorio: el backend lo valida (@NotNull) antes de sustituirlo por el id de la ruta. */
    returnRequestId: string;
    items: InspeccionItemDto[];
    overallCondition: string;
    overallNotes?: string;
}

/** Respuesta de `GET|POST /returns/{id}/inspection` — `ReturnInspectionResponse` (Java). */
export interface InspeccionDevolucion {
    id: string;
    returnRequestId: string;
    inspectionDate: string;
    overallCondition: string;
    overallNotes?: string;
    items: Array<InspeccionItemDto & { id: string }>;
}
