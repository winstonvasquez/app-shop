export type PickingOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PickingItemStatus = 'PENDING' | 'PICKED' | 'SKIPPED';

export interface PickingItem {
    id: string;
    productId: string;
    sku: string;
    productName: string;
    locationCode: string;
    requestedQty: number;
    pickedQty: number;
    status: PickingItemStatus;
}

export interface PickingOrder {
    id: string;
    referenceOrderId: string;
    companyId: string;
    assignedTo?: string;
    status: PickingOrderStatus;
    items: PickingItem[];
    completionPercent: number;
    createdAt: string;
    updatedAt?: string;
}

export interface PickingPage {
    content: PickingOrder[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface PickItemBody {
    pickedQty: number;
    locationCode?: string;
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
