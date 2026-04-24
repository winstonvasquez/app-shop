export type StorePickupStatus = 'PENDING' | 'READY' | 'PICKED_UP' | 'EXPIRED' | 'CANCELLED';

export interface StorePickup {
    id: string;
    orderId: string;
    storeId: string;
    companyId: string;
    status: StorePickupStatus;
    verificationCode?: string;
    readyAt?: string;
    pickedUpAt?: string;
    createdAt: string;
}

export interface StorePickupPage {
    content: StorePickup[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface CreateStorePickupBody {
    orderId: string;
    storeId: string;
    companyId: string;
}

export interface VerifyPickupBody {
    id: string;
    verificationCode: string;
}
