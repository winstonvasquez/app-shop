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

/** Mapea 1:1 CotizacionDetalleDto (microshopcompras) — GET /api/cotizaciones/{id}. */
export interface CotizacionDetalleDto {
    id: string;
    codigo: string;
    titulo: string;
    descripcion: string | null;
    estado: string;
    fechaEmision: string;
    fechaVencimiento: string;
    items: CotizacionItemDetalleDto[];
    proveedores: CotizacionProveedorDetalleDto[];
    companyId: string;
}

export interface CotizacionItemDetalleDto {
    id: string;
    productoId: string | null;
    productoNombre: string;
    sku: string | null;
    cantidad: number;
    unidadMedida: string | null;
    especificaciones: string | null;
}

export interface CotizacionProveedorDetalleDto {
    proveedorId: string;
    razonSocial: string;
    estado: string;
}

/** Mapea ActualizarCotizacionRequest (microshopcompras) — PUT /api/cotizaciones/{id}. Solo permitido en estado CREADA. */
export interface ActualizarCotizacionRequest {
    titulo: string;
    descripcion?: string;
    fechaVencimiento: string;
    items: CotizacionItemRequest[];
}
