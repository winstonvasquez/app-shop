export interface Almacen {
    id: string;
    codigo: string;
    nombre: string;
    direccion: string;
    telefono: string;
    responsableId: string;
    estado: string;
    totalItems: number;
    createdAt: string;
}

export interface CreateAlmacenDto {
    codigo: string;
    nombre: string;
    direccion?: string;
    telefono?: string;
    responsableId?: string;
}

export interface Pagination<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
