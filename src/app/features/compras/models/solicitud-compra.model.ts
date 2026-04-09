export interface SolicitudCompraItem {
    id?: string;
    productoId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    unidadMedida?: string;
    precioEstimado?: number;
    proveedorSugeridoId?: string;
    observaciones?: string;
}

export interface SolicitudCompra {
    id?: string;
    codigo?: string;
    solicitanteId?: string;
    solicitanteNombre?: string;
    departamento?: string;
    justificacion: string;
    prioridad?: string;
    fechaRequerida?: string;
    estado?: string;
    aprobadorId?: string;
    fechaAprobacion?: string;
    motivoRechazo?: string;
    ordenCompraId?: string;
    items?: SolicitudCompraItem[];
    createdAt?: string;
    updatedAt?: string;
}

export interface SolicitudCompraPage {
    content: SolicitudCompra[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
