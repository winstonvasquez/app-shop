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
    /** OJO: el backend espera el param `conImagen` (CategoriaController.getAll), no `hasImage`. */
    conImagen?: boolean;
    activo?: boolean;
    padreId?: number;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
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
