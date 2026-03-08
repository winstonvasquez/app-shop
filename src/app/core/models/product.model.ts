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
    vendedor?: any;
    imagenes?: any[];
    categorias?: any[];
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
