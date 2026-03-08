export interface PaginationConfig {
    page: number;
    size: number;
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
    page?: {
        totalPages: number;
        totalElements: number;
        size: number;
        number: number;
    };
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}
