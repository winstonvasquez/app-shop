export interface OrdenCompra {
    id?: string;
    codigo: string;
    proveedorId: string;
    proveedorNombre?: string;
    proveedorRuc?: string;
    fechaEmision: string;
    fechaEntregaEstimada?: string;
    condicionPago: string;
    almacenDestino: string;
    estado: string;
    subtotal?: number;
    igv?: number;
    total?: number;
    observaciones?: string;
    items?: OrdenCompraItem[];
    createdAt?: string;
    updatedAt?: string;
}

export interface OrdenCompraItem {
    id?: string;
    productoId?: string;
    varianteId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    precioUnitario: number;
    igv?: number;
    subtotal?: number;
}

export interface OrdenCompraPage {
    content: OrdenCompra[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface Recepcion {
    id?: string;
    ordenCompraId: string;
    ordenCompraCodigo?: string;
    numeroRecepcion?: string;
    numeroGuia?: string;
    transportista?: string;
    fechaRecepcion: string;
    responsable?: string;
    almacenDestino: string;
    estado: string;
    observaciones?: string;
    items?: RecepcionItem[];
}

export interface ItemRecepcionRequest {
    ordenItemId: string;
    cantidadRecibida: number;
    observaciones?: string;
}

export interface RecepcionItem {
    id?: string;
    ordenItemId: string;
    productoNombre?: string;
    cantidadPedida: number;
    cantidadRecibida: number;
    diferencia: number;
    estado: string;
}
