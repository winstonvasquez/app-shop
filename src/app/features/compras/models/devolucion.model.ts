export interface Devolucion {
    id?: string;
    codigo?: string;
    ordenCompraId: string;
    ordenCompraCodigo?: string;
    proveedorId?: string;
    proveedorNombre?: string;
    recepcionId?: string;
    motivo: string;
    tipo?: string;
    estado?: string;
    observaciones?: string;
    items?: DevolucionItem[];
    createdAt?: string;
}

export interface DevolucionItem {
    id?: string;
    ordenItemId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    motivoItem?: string;
}

export interface CrearDevolucionRequest {
    ordenCompraId: string;
    recepcionId?: string;
    motivo: string;
    tipo?: string;
    observaciones?: string;
    items: ItemDevolucionRequest[];
}

export interface ItemDevolucionRequest {
    ordenItemId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    motivoItem?: string;
}
