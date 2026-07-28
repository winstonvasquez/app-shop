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

/**
 * Body de `POST /logistics/api/routes/generate` — alineado byte a byte con
 * `GenerateRouteRequest` (Java): fecha + almacén de origen son obligatorios,
 * shipmentIds no puede ir vacío. driverName/driverId/vehiclePlate son libres
 * (no hay entidad "Conductor": ver `DeliveryRouteCommandService`).
 */
export interface GenerateRouteBody {
    date: string;
    warehouseId: string;
    shipmentIds: string[];
    driverName?: string;
    driverId?: string;
    vehiclePlate?: string;
}
