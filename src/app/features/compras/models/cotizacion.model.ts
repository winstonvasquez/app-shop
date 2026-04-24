import { Page } from '@core/models/pagination.model';

export interface CotizacionResumen {
    id: string;
    codigo: string;
    titulo: string;
    estado: string;
    fechaEmision: string;
    fechaVencimiento: string;
    totalItems: number;
    totalProveedores: number;
    respuestasRecibidas: number;
    companyId: string;
}

export interface CrearCotizacionRequest {
    titulo: string;
    descripcion?: string;
    fechaVencimiento: string;
    items: CotizacionItemRequest[];
    proveedorIds: string[];
}

export interface CotizacionItemRequest {
    productoId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    unidadMedida?: string;
    especificaciones?: string;
}

export interface RegistrarRespuestaRequest {
    proveedorId: string;
    condicionPago?: string;
    plazoEntregaDias?: number;
    validezOfertaDias?: number;
    observaciones?: string;
    items: ItemRespuesta[];
}

export interface ItemRespuesta {
    cotizacionItemId: string;
    precioUnitario: number;
    disponible?: boolean;
    observaciones?: string;
}

export interface ComparativaDto {
    cotizacionId: string;
    codigo: string;
    titulo: string;
    proveedores: string[];
    filas: FilaComparativaDto[];
    totales: TotalProveedorDto[];
}

export interface FilaComparativaDto {
    productoNombre: string;
    cantidad: number;
    precios: (number | null)[];
    precioMinimo: number | null;
}

export interface TotalProveedorDto {
    proveedorId: string;
    proveedorNombre: string;
    total: number;
    plazoEntregaDias: number | null;
    condicionPago: string | null;
    estado: string;
}

export type CotizacionesPage = Page<CotizacionResumen>;
