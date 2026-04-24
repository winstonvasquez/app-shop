export type PackingOrderStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export interface PackingOrder {
    id: string;
    referenceOrderId: string;
    companyId: string;
    assignedTo?: string;
    status: PackingOrderStatus;
    createdAt: string;
    completedAt?: string;
}

export interface PackingPage {
    content: PackingOrder[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
