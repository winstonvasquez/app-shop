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

/**
 * Normaliza la respuesta paginada de Spring a un `Page<T>` completo, venga en la forma plana
 * (`{ content, totalElements, … }`) o en la anidada de Boot 3 (`{ content, page: { … } }`).
 *
 * Este bloque estaba copiado **nueve veces** en los servicios de compras, como un `map` inline
 * dentro del `pipe`. Por vivir dentro del observable era imposible de cubrir sin montar HttpClient,
 * así que su CRAP era 182 en el mejor de los casos. Aquí es una función pura de dos argumentos.
 *
 * `page` y `size` son los que se PIDIERON: sirven de último recurso cuando el backend no los
 * devuelve, para que la tabla no se quede sin saber en qué página está.
 *
 * Dos divergencias de las nueve copias se unifican a conciencia, ambas hacia el comportamiento más
 * correcto: (1) siete copias no miraban `page.size`/`page.number` anidados y caían directas al
 * valor pedido — da el mismo número salvo que el backend recorte el tamaño; (2) dos copias
 * (proveedores y recepciones) omitían `first`/`last`/`empty`, que quedaban `undefined`; ahora
 * llegan como `false`, que es falsy igual y además cumple el tipo.
 */
export function adaptSpringPage<T>(raw: unknown, page: number, size: number): Page<T> {
    const r = (raw ?? {}) as Record<string, unknown>;
    const anidado = r['page'] as Record<string, unknown> | undefined;
    const num = (clave: string, porDefecto: number): number =>
        (r[clave] as number) ?? (anidado?.[clave] as number) ?? porDefecto;

    return {
        content: (r['content'] as T[]) ?? [],
        totalElements: num('totalElements', 0),
        totalPages: num('totalPages', 0),
        size: num('size', size),
        number: num('number', page),
        first: !!r['first'],
        last: !!r['last'],
        empty: !!r['empty'],
    };
}
