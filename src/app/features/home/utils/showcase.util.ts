import { PaginationConfig } from '@core/models/pagination.model';
import { ProductFilter } from '@core/services/product.service';

/** Carruseles de producto del home. Cada uno es una consulta distinta al catálogo. */
export type ShowcaseType = 'best-sellers' | 'top-rated' | 'new-arrivals';

export interface ConsultaDeShowcase {
    sort: NonNullable<PaginationConfig['sort']>;
    filter: ProductFilter;
    /** Insignia que la sección impone cuando el producto no trae la suya. */
    badgeDeSeccion?: string;
}

/**
 * Qué le pide al catálogo cada carrusel del home.
 *
 * Las reglas que codifica:
 * - **Cada carrusel ordena por su propia métrica**, siempre descendente: los más vendidos por
 *   `salesCount`, los mejor valorados por `rating` y los recién llegados por fecha de alta.
 * - **«Mejor valorados» además filtra**: sin `minRating` el carrusel se llenaría de productos
 *   sin valoraciones, que es justo lo contrario de lo que promete el título.
 * - **Sólo «Recién llegados» impone insignia propia** (`NUEVO`); en los demás la tarjeta decide
 *   con el descuento o el stock bajo.
 */
export function consultaDeShowcase(type: ShowcaseType): ConsultaDeShowcase {
    switch (type) {
        case 'best-sellers':
            return { sort: { field: 'salesCount', direction: 'desc' }, filter: {} };
        case 'top-rated':
            return { sort: { field: 'rating', direction: 'desc' }, filter: { minRating: 4 } };
        case 'new-arrivals':
            return { sort: { field: 'fechaCreacion', direction: 'desc' }, filter: {}, badgeDeSeccion: 'NUEVO' };
    }
}
