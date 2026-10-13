import type { ProductDetail } from '@features/products/models/product-detail.model';

/** Entrada del historial «vistos recientemente» que se guarda en `localStorage`. */
export interface ItemDeHistorial {
    id: number;
    name: string;
    image: string;
    price: number;
    /** Slug del producto si el backend lo manda; si no, el id, que siempre resuelve la ficha. */
    slug: unknown;
}

/** Cuántos productos recuerda el historial de navegación. */
export const MAX_HISTORIAL = 20;

/**
 * Reduce la ficha de producto a lo que el carrusel de «vistos recientemente» necesita pintar.
 *
 * Regla de negocio: la tarjeta del historial no puede quedar rota, así que un producto sin
 * imágenes guarda cadena vacía (el `img` cae al placeholder) y uno sin slug guarda su id, que
 * también resuelve la ficha. Nunca `undefined`: el historial se serializa a JSON y una clave
 * ausente rompería a quien lo lee.
 */
export function itemDeHistorial(product: ProductDetail): ItemDeHistorial {
    return {
        id: product.id,
        name: product.nombre,
        image: product.images?.[0]?.url ?? '',
        price: product.precioBase,
        slug: (product as unknown as Record<string, unknown>)['slug'] ?? product.id,
    };
}

/**
 * Coloca el producto al frente del historial.
 *
 * Reglas de negocio: el historial se ordena por última visita, así que volver a ver un producto
 * lo mueve al principio en vez de duplicarlo (dedupe por id), y sólo se conservan los
 * `max` más recientes — los que se caen por el final se olvidan.
 */
export function agregarAHistorial(
    historial: readonly ItemDeHistorial[],
    item: ItemDeHistorial,
    max: number = MAX_HISTORIAL,
): ItemDeHistorial[] {
    const resto = historial.filter((h) => h.id !== item.id);
    return [item, ...resto].slice(0, max);
}
