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

/**
 * Extracts totalElements from a Spring Page response, supporting both
 * the legacy flat shape ({ totalElements }) and Boot 3 nested shape
 * ({ page: { totalElements } }). Returns 0 when neither is present.
 */
export function pageTotalElements(res: unknown): number {
    const r = res as { totalElements?: number; page?: { totalElements?: number } };
    return r?.totalElements ?? r?.page?.totalElements ?? 0;
}

/** Same as pageTotalElements but for totalPages. */
export function pageTotalPages(res: unknown): number {
    const r = res as { totalPages?: number; page?: { totalPages?: number } };
    return r?.totalPages ?? r?.page?.totalPages ?? 0;
}
