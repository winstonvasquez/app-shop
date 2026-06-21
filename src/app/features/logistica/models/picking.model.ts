// Alineado al contrato real del backend (PickingOrderResponse / PickingOrderItemResponse).
export type PickingOrderStatus = 'PENDING_PICKING' | 'PICKING' | 'PICKED' | 'CANCELLED';

export interface PickingItem {
    id: string;
    productoId: string;
    varianteId?: string;
    sku: string;
    productoNombre: string;
    cantidadSolicitada: number;
    cantidadRecogida: number;
    ubicacion?: string;
    notas?: string;
    /** Secuencia de recorrido (pick path) optimizada por ubicación: 1, 2, 3… */
    secuencia: number;
}

export interface PickingOrder {
    id: string;
    orderId: string;
    warehouseId: string;
    status: PickingOrderStatus;
    assignedTo?: string;
    pickingStartedAt?: string;
    pickingCompletedAt?: string;
    notes?: string;
    companyId: string;
    createdAt: string;
    updatedAt?: string;
    items: PickingItem[];
}

export interface PickingPage {
    content: PickingOrder[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface PickItemBody {
    cantidadRecogida: number;
    notas?: string;
}

export interface CompletePickingBody {
    notes?: string;
}

export type BatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface PickingBatch {
    id: string;
    companyId: string;
    status: BatchStatus;
    orderIds: string[];
    items: PickingItem[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

export interface PickingBatchPage {
    content: PickingBatch[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface GenerateBatchBody {
    orderIds: string[];
    companyId: string;
}
