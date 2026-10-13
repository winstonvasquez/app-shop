// `import type` a propósito: `cart.service` importa de aquí, así que es un ciclo. Al ser sólo
// tipo, el import se borra al compilar y el ciclo no llega al bundle.
import type { CartItem } from '../services/cart.service';
import type { CuponLinea } from '@core/services/order.service';

/** Producto tal como llega desde el catálogo al pulsar «Agregar al carrito». */
export interface ProductoParaCarrito {
    id: number;
    variantId?: number;
    sku?: string;
    variantName?: string;
    name: string;
    description?: string;
    price: number;
    quantity?: number;
    stock?: number;
    image: string;
}

/**
 * Decide si el carrito en memoria debe vaciarse al cambiar la empresa activa de la sesión.
 *
 * Es aislamiento multi-tenant: los `productId` de una empresa no existen en otra, así que un
 * carrito que sobreviva al cambio de empresa acaba en un pedido con líneas de un tenant ajeno.
 *
 * Las tres transiciones y su porqué:
 * - `undefined -> X`: primera lectura de la sesión, todavía no se ha observado un cambio. NO se
 *   limpia (si no, el carrito recuperado de localStorage se borraría en el arranque).
 * - `null -> X` (invitado que inicia sesión): NO se limpia. El invitado estaba comprando en ESE
 *   storefront; borrarle el carrito al loguearse sería una regresión de UX.
 * - `X -> Y` (cambio de empresa) y `X -> null` (logout): SÍ se limpia — en el segundo caso para
 *   que el siguiente usuario del navegador no herede el carrito del anterior.
 *
 * @param anterior empresa del carrito que hay en memoria; `undefined` = aún no observada
 * @param actual   empresa activa de la sesión; `null` = sin sesión (invitado o logout)
 */
export function debeLimpiarPorCambioDeEmpresa(
    anterior: number | null | undefined,
    actual: number | null,
): boolean {
    if (anterior === undefined) return false;
    if (anterior === actual) return false;
    return anterior !== null;
}

/**
 * Añade un producto al carrito devolviendo una lista NUEVA (el estado es inmutable: la señal se
 * reemplaza, nunca se muta).
 *
 * Las reglas que codifica:
 * - **La identidad de una línea la da la variante cuando existe.** Dos tallas del mismo producto
 *   son dos líneas; el producto sin variante sólo se agrupa con otro sin variante (por eso el
 *   `item.variantId === undefined` explícito y no un simple match por `productId`).
 * - **Volver a agregar suma cantidades y re-selecciona la línea**, para que el ítem que el
 *   usuario acaba de agregar entre sí o sí en el total aunque lo hubiera deseleccionado antes.
 * - **La cantidad por defecto es 1**, y se resuelve con `??` para no descartar un 0 explícito
 *   como haría `||`.
 */
export function agregarItem(items: readonly CartItem[], product: ProductoParaCarrito): CartItem[] {
    const esElMismo = (item: CartItem) =>
        product.variantId !== undefined
            ? item.variantId === product.variantId
            : item.productId === product.id && item.variantId === undefined;

    if (items.some(esElMismo)) {
        return items.map(item =>
            esElMismo(item)
                ? { ...item, quantity: item.quantity + (product.quantity ?? 1), selected: true }
                : item,
        );
    }

    return [...items, {
        productId: product.id,
        variantId: product.variantId,
        sku: product.sku,
        variantName: product.variantName,
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity ?? 1,
        stock: product.stock,
        image: product.image,
        selected: true,
    }];
}

/** Líneas SELECCIONADAS en la forma que espera `POST /cupones/validate` (`items`). */
export function lineasParaCupon(items: readonly CartItem[]): CuponLinea[] {
    return items
        .filter(i => i.selected)
        .map(i => ({ productoId: i.productId, subtotal: i.price * i.quantity }));
}
