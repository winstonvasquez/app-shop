export type EstadoGuia = 'EMITIDA' | 'ACEPTADA' | 'RECHAZADA' | 'ANULADA';

export interface GuiaRemisionItem {
    id: string;
    productoId: string;
    productoNombre: string;
    sku: string;
    cantidad: number;
    unidad: string;
    descripcion: string;
}

export type MotivoTraslado = '01' | '02' | '04' | '08' | '09' | '13' | '14' | '18' | '19';
export type ModalidadTraslado = '01' | '02'; // 01=Público, 02=Privado

export interface GuiaRemision {
    id: string;
    numero: string;
    serie: string;
    numeroDocumento: string;
    fechaEmision: string;
    fechaInicioTraslado: string | null;
    almacenOrigenId: string;
    almacenOrigenNombre: string;
    direccionOrigen: string;
    ubigeoOrigen?: string;
    destinatarioRuc: string;
    destinatarioRazonSocial: string;
    destinatarioDireccion: string;
    ubigeoDestino?: string;
    puntoLlegada: string;
    motivoTraslado: string;
    descripcionTraslado: string;
    modalidadTraslado?: ModalidadTraslado;
    pesoBrutoTotal?: number;
    transportistaRuc: string;
    transportistaRazonSocial: string;
    transportistaMtc?: string;
    vehiculoPlaca: string;
    conductorDocumento: string;
    conductorNombre: string;
    conductorLicencia?: string;
    estado: EstadoGuia;
    items: GuiaRemisionItem[];
    createdAt: string;
}

export interface CreateGuiaRemisionDto {
    serie: string;
    numeroDocumento: string;
    fechaEmision?: string;
    fechaInicioTraslado?: string;
    almacenOrigenId: string;
    direccionOrigen: string;
    ubigeoOrigen?: string;
    destinatarioRuc?: string;
    destinatarioRazonSocial?: string;
    destinatarioDireccion?: string;
    ubigeoDestino?: string;
    puntoLlegada?: string;
    motivoTraslado?: string;
    descripcionTraslado?: string;
    modalidadTraslado?: string;
    pesoBrutoTotal?: number;
    transportistaRuc?: string;
    transportistaRazonSocial?: string;
    transportistaMtc?: string;
    vehiculoPlaca?: string;
    conductorDocumento?: string;
    conductorNombre?: string;
    conductorLicencia?: string;
    items: GuiaRemisionItemDto[];
}

export interface GuiaRemisionItemDto {
    productoId?: string;
    productoNombre: string;
    sku?: string;
    cantidad: number;
    unidad: string;
    descripcion?: string;
}

export interface Pagination<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
