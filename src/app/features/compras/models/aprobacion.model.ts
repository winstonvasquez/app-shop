export interface AprobacionPendiente {
    id: string;
    ordenCompraId: string;
    ordenCompraCodigo: string;
    ordenCompraTotal: number;
    proveedorNombre: string;
    nivelNombre: string;
    rolAprobador: string;
    orden: number;
    fechaSolicitud: string;
    companyId: string;
}

export interface NivelAprobacion {
    id: string;
    companyId: string;
    nombre: string;
    montoMinimo: number;
    montoMaximo: number | null;
    rolAprobador: string;
    orden: number;
    activo: boolean;
}

export interface ConfigAprobacionRequest {
    nombre: string;
    montoMinimo: number;
    montoMaximo: number | null;
    rolAprobador: string;
    orden: number;
}
