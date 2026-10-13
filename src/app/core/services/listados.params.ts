import { PaginationConfig } from '@core/models/pagination.model';
// `import type` a propósito: product.service importa este archivo, así que un import de valor
// cerraría un ciclo en tiempo de ejecución. Como sólo se usa el tipo, se borra al compilar.
import type { ProductFilter } from './product.service';
import { CategoryFilter } from '@core/models/category.model';

/**
 * Traduce la paginación de pantalla al contrato de Spring Data: `page`, `size` y un `sort`
 * de una sola cadena `campo,direccion` (que es como `Pageable` lo parsea). Sin orden elegido
 * el parámetro NO viaja — mandar `sort` vacío hace que Spring lance 400, no que ordene por
 * defecto.
 */
export function paramsDePaginacion(pagination: PaginationConfig): Record<string, unknown> {
    return {
        page: pagination.page,
        size: pagination.size,
        sort: pagination.sort ? `${pagination.sort.field},${pagination.sort.direction}` : undefined,
    };
}

/**
 * Parámetros del listado de productos (`GET /api/v1/productos`).
 *
 * Dos nombres que NO coinciden con los del frontend y que hay que respetar tal cual, porque
 * `ProductoController.getAll` los declara así:
 *  - el rango de precio es `precioMin`/`precioMax`, no `minPrice`/`maxPrice`;
 *  - la marca viaja **repetida** (`?marca=A&marca=B`) y en SINGULAR, así que la clave es `marca`
 *    y el valor es el array entero — `toHttpParams` se encarga de repetirlo.
 *
 * Los valores se dejan crudos: quién decide qué se omite es `toHttpParams` (descarta
 * `undefined`/`null`/`''`, pero SÍ envía `0` y `false`, que aquí son elecciones legítimas —
 * `activo: false` es «ver los inactivos», no «sin filtro»).
 */
export function paramsDeProductos(
    pagination: PaginationConfig,
    filter: ProductFilter = {},
): Record<string, unknown> {
    return {
        ...paramsDePaginacion(pagination),
        search: filter.search,
        companyId: filter.companyId,
        categoriaId: filter.categoriaId,
        precioMin: filter.precioMin,
        precioMax: filter.precioMax,
        marca: filter.marcas,
        minRating: filter.minRating,
        fechaCreacionDesde: filter.fechaCreacionDesde,
        fechaCreacionHasta: filter.fechaCreacionHasta,
        activo: filter.activo,
    };
}

/**
 * Parámetros del listado de categorías (`GET /api/v1/categorias`).
 *
 * Mismo criterio que productos, con un nombre que tampoco coincide: el backend espera
 * `conImagen` (`CategoriaController.getAll`), no `hasImage`.
 */
export function paramsDeCategorias(
    pagination: PaginationConfig,
    filter: CategoryFilter = {},
): Record<string, unknown> {
    return {
        ...paramsDePaginacion(pagination),
        search: filter.search,
        nivel: filter.nivel,
        conImagen: filter.conImagen,
        activo: filter.activo,
        padreId: filter.padreId,
        fechaCreacionDesde: filter.fechaCreacionDesde,
        fechaCreacionHasta: filter.fechaCreacionHasta,
    };
}
