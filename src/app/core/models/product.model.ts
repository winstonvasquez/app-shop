export interface ProductImagen {
    url: string;
    esPrincipal?: boolean;
    orden?: number;
}

export interface ProductCategoria {
    id: number;
    nombre: string;
}

/** Empresa dueña del producto, tal como la manda `ProductoResponseDto.company`. */
export interface ProductCompany {
    id: number;
    name: string;
    ruc?: string;
    isActive?: boolean;
}

export interface ProductVendedor {
    id: number;
    nombre: string;
    ruc?: string;
}

export interface ProductResponse {
    id: number;
    nombre: string;
    descripcion: string;
    precioBase: number;
    marca?: string;
    stock: number;
    company?: ProductCompany;
    originalPrice?: number;
    discount?: string;
    badge?: string;
    salesCount?: string;
    rating?: number;
    savingsExtra?: string;
    timerEndTime?: string;
    features?: string;
    starSeller?: boolean;
    vendedor?: ProductVendedor;
    imagenes?: ProductImagen[];
    categorias?: ProductCategoria[];
    /** Etiqueta de la promoción vigente vinculada (V69), ej. "-20%" o "-S/ 15.00". Null si no hay ninguna activa.
     *  Distinta de `badge` (deducido de stock bajo, sin relación con Promocion). */
    promocionEtiqueta?: string | null;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

export interface Pageable {
    page?: number;
    size?: number;
    sort?: string;
}
