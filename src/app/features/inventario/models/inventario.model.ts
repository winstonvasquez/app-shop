export interface InventarioMovimiento {
    id?: number;
    productId: number;
    warehouseId: number;
    date: string;
    type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
    quantity: number;
    reference?: string;
    notes?: string;
    userId?: number;
}

export interface InventarioStock {
    id?: number;
    productId: number;
    warehouseId: number;
    quantity: number;
    minQuantity: number;
    maxQuantity: number;
    lastUpdate: string;
}

export interface KardexEntry {
    id?: number;
    productId: number;
    warehouseId: number;
    date: string;
    movementType: string;
    documentRef: string;
    quantityIn: number;
    quantityOut: number;
    balance: number;
    unitCost: number;
    totalCost: number;
}
