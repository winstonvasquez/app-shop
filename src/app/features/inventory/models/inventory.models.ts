export type InventoryMovementType =
    | 'ENTRADA_COMPRA'
    | 'ENTRADA_DEVOLUCION'
    | 'ENTRADA_AJUSTE'
    | 'ENTRADA_TRANSFERENCIA'
    | 'ENTRADA_PRODUCCION'
    | 'SALIDA_VENTA'
    | 'SALIDA_DEVOLUCION'
    | 'SALIDA_AJUSTE'
    | 'SALIDA_TRANSFERENCIA'
    | 'SALIDA_CONSUMO'
    | 'SALIDA_MERMA';
export type InventoryTransferStatus = 'PENDIENTE' | 'ENVIADA' | 'RECIBIDA' | 'CANCELADA';
export type InventoryCountStatus = 'EN_PROCESO' | 'CERRADO' | 'AJUSTADO';

export interface Warehouse {
    id: number;
    code: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    responsiblePerson?: string;
    active: boolean;
    isPrincipal?: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface Location {
    id: number;
    warehouseId: number;
    warehouseName?: string;
    code: string;
    name?: string;
    description?: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
    active: boolean;
    capacity?: number;
    locationType?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface InventoryStock {
    id: number;
    productId: number;
    warehouseId: number;
    warehouseName?: string;
    locationId?: number;
    locationName?: string;
    quantity: number;
    reservedQuantity?: number;
    availableQuantity?: number;
    minimumStock?: number;
    maximumStock?: number;
    reorderPoint?: number;
    averageCost?: number;
    lastCost?: number;
    totalValue?: number;
    belowMinimum?: boolean;
    needsReorder?: boolean;
    updatedAt?: string;
}

export interface InventoryMovement {
    id: number;
    movementNumber?: string;
    movementType: InventoryMovementType;
    warehouseId: number;
    warehouseName?: string;
    productId: number;
    productName?: string;
    sku?: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    movementDate: string;
    reason?: string;
    referenceType?: string;
    referenceId?: number;
    referenceNumber?: string;
    lotId?: number;
    lotNumber?: string;
    serialNumberId?: number;
    serialNumber?: string;
    locationId?: number;
    locationName?: string;
    balanceAfter?: number;
    performedBy?: string;
    createdAt: string;
    tenantId?: string;
}

export interface InventoryMovementRequest {
    productId: number;
    warehouseId: number;
    quantity: number;
    movementType: InventoryMovementType;
    unitCost?: number;
    movementDate: string;
    reason?: string;
    referenceType?: string;
    referenceId?: number;
    referenceNumber?: string;
    lotId?: number;
    serialNumberId?: number;
    locationId?: number;
}

export interface InventoryTransferItem {
    productId: number;
    requestedQuantity: number;
    notes?: string;
    lotId?: number;
    serialNumberId?: number;
}

export interface InventoryTransfer {
    id: number;
    transferNumber?: string;
    sourceWarehouseId: number;
    sourceWarehouseName?: string;
    destinationWarehouseId: number;
    destinationWarehouseName?: string;
    status: InventoryTransferStatus;
    requestDate?: string;
    sentDate?: string;
    receivedDate?: string;
    notes?: string;
    requestedBy?: string;
    sentBy?: string;
    receivedBy?: string;
    details?: InventoryTransferItem[];
    createdAt: string;
    updatedAt?: string;
    tenantId?: string;
}

export interface InventoryTransferRequest {
    sourceWarehouseId: number;
    destinationWarehouseId: number;
    requestDate: string;
    notes?: string;
    details: InventoryTransferItem[];
}

export interface InventoryCount {
    id: number;
    countNumber?: string;
    warehouseId: number;
    warehouseName?: string;
    status: InventoryCountStatus;
    countDate?: string;
    closedDate?: string;
    adjustedDate?: string;
    createdAt: string;
    tenantId?: string;
}

export interface InventoryCountDetailRequest {
    productId: number;
    countedQuantity: number;
    lotId?: number;
    serialNumberId?: number;
    locationId?: number;
    notes?: string;
}

export interface InventoryCountRequest {
    warehouseId: number;
    countDate: string;
    notes?: string;
    details: InventoryCountDetailRequest[];
}

export interface KardexEntry {
    movementId: number;
    movementNumber?: string;
    movementDate: string;
    movementType: InventoryMovementType;
    warehouseName?: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    balanceAfter: number;
    referenceType?: string;
    referenceNumber?: string;
    reason?: string;
    performedBy?: string;
}

export interface PageResponse<T> {
    content: T[];
    page: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
    };
}
