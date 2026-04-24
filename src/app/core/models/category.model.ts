export interface CategoryResponse {
    id: number;
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
    nivel: number;
    categoriaPadreId?: number;
    activo?: boolean;
    orden?: number;
    fechaCreacion?: string;
    fechaActualizacion?: string;
}

export interface CategoryRequest {
    nombre: string;
    descripcion: string;
    imagenUrl?: string;
    nivel: number;
    categoriaPadreId?: number;
    activo?: boolean;
    orden?: number;
}

export interface CategoryFilter {
    search?: string;
    nivel?: number;
    hasImage?: boolean;
    activo?: boolean;
}

export interface Category {
    id: number;
    nombre: string;
    descripcion: string;
    imagenUrl: string;
    nivel: number;
}

export interface MegaMenuProductoItem {
    id: number;
    nombre: string;
    imagenUrl: string | null;
    precio: number;
    badge: string | null;
}

export interface MegaMenuCategoriaDto {
    id: number;
    nombre: string;
    imagenUrl: string | null;
    productos: MegaMenuProductoItem[];
}
