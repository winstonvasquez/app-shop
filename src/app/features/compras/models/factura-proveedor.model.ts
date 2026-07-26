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

/** Espejo de `CpeItem` (record backend) — línea de detalle extraída del XML UBL 2.1. */
export interface CpeItem {
    descripcion: string;
    sku?: string;
    cantidad: number;
    precioUnitario: number;
}

/** Espejo de `CpeParsedInvoice` (record backend) — resultado de `POST /cpe/parse`. */
export interface CpeParsedInvoice {
    rucEmisor: string;
    razonSocial: string;
    serie: string;
    numero: string;
    tipoDocumento: string;
    fechaEmision: string;
    moneda: string;
    subtotal: number;
    igv: number;
    total: number;
    items: CpeItem[];
}
