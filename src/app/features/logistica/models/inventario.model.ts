export interface InventarioItem {
    id: string;
    almacenId: string;
    almacenNombre: string;
    productoId: string;
    productoNombre: string;
    sku: string;
    cantidad: number;
    cantidadReservada: number;
    cantidadDisponible: number;
    stockMinimo: number;
    stockMaximo: number;
    estadoStock?: 'NORMAL' | 'BAJO' | 'CRITICO' | 'SOBRESTOCK';
}

export interface InventarioPage {
    content: InventarioItem[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface InventarioFilter {
    almacenId?: string;
    busqueda?: string;
    page?: number;
    size?: number;
}
