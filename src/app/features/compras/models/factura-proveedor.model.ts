export interface FacturaProveedor {
    id?: string;
    ordenCompraId: string;
    ordenCompraCodigo?: string;
    proveedorId: string;
    proveedorNombre?: string;
    serie: string;
    numero: string;
    tipoDocumento?: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    subtotal: number;
    igv: number;
    total: number;
    moneda?: string;
    estado: string;
    resultadoMatch?: string;
    observaciones?: string;
    items?: FacturaProveedorItem[];
    createdAt?: string;
}

export interface FacturaProveedorItem {
    id?: string;
    ordenItemId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    matchOk: boolean;
    observaciones?: string;
}

export interface RegistrarFacturaRequest {
    ordenCompraId: string;
    serie: string;
    numero: string;
    tipoDocumento?: string;
    fechaEmision: string;
    fechaVencimiento?: string;
    moneda?: string;
    observaciones?: string;
    items: ItemFacturaRequest[];
}

export interface ItemFacturaRequest {
    ordenItemId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    precioUnitario: number;
}
