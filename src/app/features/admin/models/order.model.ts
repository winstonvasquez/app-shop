// Models aligned with backend DTOs from microshopventas

export interface OrderDetail {
    id: number;
    varianteId: number;
    sku: string;
    productoNombre: string;
    varianteNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface OrderResponse {
    id: number;
    usuarioId: number;
    fechaPedido: string; // ISO Date
    estado: OrderStatus;
    total: number;
    detalles?: OrderDetail[]; // Opcional en lista
}

export type OrderStatus = 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';

export interface OrderStatusUpdate {
    estado: OrderStatus;
    observacion?: string;
}

// Helpers
export const ORDER_STATUSES: { value: OrderStatus, label: string, color: string }[] = [
    { value: 'PENDIENTE', label: 'Pendiente', color: 'gray' },
    { value: 'PAGADO', label: 'Pagado', color: 'blue' },
    { value: 'ENVIADO', label: 'Enviado', color: 'indigo' },
    { value: 'ENTREGADO', label: 'Entregado', color: 'green' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'red' }
];
