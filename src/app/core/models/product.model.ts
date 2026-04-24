export interface ProductImagen {
    url: string;
    esPrincipal?: boolean;
    orden?: number;
}

export interface ProductCategoria {
    id: number;
    nombre: string;
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
    companyId: number;
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
