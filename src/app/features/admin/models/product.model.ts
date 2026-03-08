// Models aligned with backend DTOs from microshopventas

export interface Company {
    id: number;
    name: string;
    ruc: string;
    active: boolean;
}

export interface Category {
    id: number;
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
    nivel: number;
}

export interface ProductResponse {
    id: number;
    nombre: string;
    descripcion: string | null;
    precioBase: number;
    marca: string | null;
    company: Company;
    categorias: Category[];
}

export interface ProductRequest {
    nombre: string;
    descripcion?: string | null;
    precioBase: number;
    marca?: string | null;
    companyId: number;
    categoriaIds?: number[];
}

// Extended model for frontend with additional properties for UX
export interface ProductFormModel extends Omit<ProductRequest, 'companyId' | 'categoriaIds'> {
    id?: number; // For edit mode
    companyId: number | null; // Allow null for form initialization
    categoriaIds: number[]; // Always array, never undefined

    // Additional frontend-only properties
    _isLoading?: boolean;
    _isDirty?: boolean;
    _errors?: Record<string, string>;
}

// Pagination response
// Pagination response aligned with Spring Data PageSerializationMode.VIA_DTO
export interface PageResponse<T> {
    content: T[];
    page: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
    };
}

// Table filter and sort model
export interface ProductFilter {
    search?: string;
    companyId?: number;
    categoriaId?: number;
    minPrice?: number;
    maxPrice?: number;
}

export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export interface PaginationConfig {
    page: number;
    size: number;
    sort?: SortConfig;
}
