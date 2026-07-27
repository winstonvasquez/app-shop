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

/** Filtros opcionales para `GET /logistics/api/routes` (listado paginado server-side). */
export interface DeliveryRouteFiltros {
    page?: number;
    size?: number;
    status?: string;
    driverId?: string;
    warehouseId?: string;
    vehiclePlate?: string;
    q?: string;
    routeDateDesde?: string;
    routeDateHasta?: string;
    startedAtDesde?: string;
    startedAtHasta?: string;
    completedAtDesde?: string;
    completedAtHasta?: string;
}

export interface GenerateRouteBody {
    orderIds: string[];
    companyId: string;
    driverId?: string;
    vehicleId?: string;
    optimizeOrder?: boolean;
}
