export type ReservationStatus = 'RESERVED' | 'RELEASED' | 'CONSUMED' | 'EXPIRED';

/**
 * Reserva de stock — forma REAL del backend (`StockReservationResponse`, record de
 * microshoplogistica). Corrección 2026-07-26: el modelo anterior describía un
 * agregado inexistente (`items[]`, `companyId`, `reservedAt`) mientras el backend
 * devuelve UNA FILA POR PRODUCTO. `GET /stock-reservations/order/{orderId}` retorna
 * `List<StockReservationResponse>`, no un objeto singular.
 */
export interface StockReservation {
    id: string;
    orderId: string;
    /** ID del registro de inventario (InventarioEntity) que respalda la reserva */
    inventarioId: string;
    productoId: string;
    sku: string;
    cantidad: number;
    status: ReservationStatus;
    expiresAt?: string;
    /** Instante de creación (AuditEntity.fechaCreacion) */
    fechaCreacion?: string;
}

/** Item de la solicitud de reserva — espeja `ReserveStockItemRequest` del backend. */
export interface ReserveStockItem {
    productoId: string;
    /** Null/omitido si el producto no maneja variantes */
    varianteId?: string;
    sku: string;
    cantidad: number;
}

/**
 * Cuerpo de `POST /stock-reservations` — espeja `ReserveStockRequest`.
 * El tenant/company se resuelve del JWT en el backend (TenantContext), NO se envía.
 */
export interface ReserveBody {
    orderId: string;
    items: ReserveStockItem[];
}
