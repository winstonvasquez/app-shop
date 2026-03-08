export interface Movimiento {
    id: string;
    codigo: string;
    tipo: string;
    almacenOrigen: string;
    almacenDestino: string;
    referenciaTipo: string;
    referenciaId: string;
    motivo: string;
    estado: string;
    createdAt: string;
}

export interface MovimientoItem {
    productoId: string;
    varianteId?: string;
    productoNombre: string;
    sku: string;
    cantidad: number;
}

export interface CreateMovimientoDto {
    tipo: string;
    almacenOrigenId?: string;
    almacenDestinoId?: string;
    referenciaTipo?: string;
    referenciaId?: string;
    motivo?: string;
    observaciones?: string;
    items: MovimientoItem[];
}
