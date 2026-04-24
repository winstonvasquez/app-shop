export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type StopStatus = 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED';

export interface RouteStop {
    id: string;
    sequence: number;
    orderId: string;
    address: string;
    status: StopStatus;
    arrivedAt?: string;
    deliveredAt?: string;
}

export interface DeliveryRoute {
    id: string;
    companyId: string;
    driverId?: string;
    vehicleId?: string;
    status: RouteStatus;
    stops: RouteStop[];
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
}

export interface DeliveryRoutePage {
    content: DeliveryRoute[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface GenerateRouteBody {
    orderIds: string[];
    companyId: string;
    driverId?: string;
    vehicleId?: string;
    optimizeOrder?: boolean;
}
