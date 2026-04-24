export type KardexMovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO';

export interface KardexEntry {
    id: string;
    fecha: string;
    tipo: KardexMovementType;
    referencia: string;
    descripcion: string;
    cantidad: number;
    costoUnitario: number;
    costoTotal: number;
    saldoCantidad: number;
    saldoValor: number;
    productoId: string;
    almacenId: string;
}

export interface KardexPage {
    content: KardexEntry[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
