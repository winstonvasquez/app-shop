export type ReservationStatus = 'RESERVED' | 'RELEASED' | 'CONSUMED' | 'EXPIRED';

export interface StockReservationItem {
    productId: string;
    sku: string;
    qty: number;
    locationCode?: string;
}

export interface StockReservation {
    id: string;
    orderId: string;
    companyId: string;
    status: ReservationStatus;
    items: StockReservationItem[];
    reservedAt: string;
    releasedAt?: string;
    consumedAt?: string;
    expiresAt?: string;
}

export interface ReserveBody {
    orderId: string;
    companyId: string;
    items: StockReservationItem[];
    expirationMinutes?: number;
}

export interface ReleaseBody {
    reason: string;
}
