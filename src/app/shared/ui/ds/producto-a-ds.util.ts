import type { ProductResponse } from '@core/models/product.model';
import type { DsProduct } from './ds-product-card/ds-product-card.component';

/** Umbral de «quedan pocas» del storefront. */
const STOCK_BAJO = 5;

/** Importe desde el que el envío deja de cobrarse (el mismo que promete el trust strip del home). */
const ENVIO_GRATIS_DESDE = 99;

export interface OpcionesDeMapeo {
    /** Insignia propia de la sección (p. ej. `'NUEVO'` en «Recién llegados»). */
    badgeDeSeccion?: string;
    /** Campos que el carrusel impone al final, por encima de todo lo calculado (`flash`, `cat`…). */
    extra?: Partial<DsProduct>;
}

/**
 * Traduce un producto del backend a la tarjeta del sistema de diseño (`ds-product-card`).
 *
 * Vive en `shared/ui/ds` porque la consumen dos features —el catálogo y los tres carruseles del
 * home— y durante un rato existió DOS VECES con el mismo nombre y contratos distintos: la copia
 * del home no conocía `promocionEtiqueta` ni `tag`, así que sus carruseles se perdían la etiqueta
 * de promoción y el sello de vendedor destacado. Unificadas aquí hacia la versión completa.
 *
 * Reglas de negocio que codifica:
 *
 * - **Una sola insignia por tarjeta, y el orden ES la regla:** promoción → la del producto → la de
 *   la sección → la etiqueta de descuento → el aviso de stock bajo. La etiqueta de promoción manda
 *   porque es la única con vínculo real a un descuento vigente (`ProductoMapper.resolverEtiquetaPromocion`
 *   en el backend); `badge` y `discount` son heurísticas de stock/precio sin relación con Promocion.
 *   La cadena usa `??` y no `||` para que un `promocionEtiqueta` nulo no pise al `badge`.
 * - **Un producto sin stock informado NO se anuncia como «pocas unidades»:** `undefined` es «no sé»,
 *   no «cero».
 * - **El envío gratis se deduce del precio**, no lo manda el backend: desde S/ 99.
 * - **La imagen es la marcada como principal**; si ninguna lo está (o su url viene vacía), la
 *   primera que haya llegado.
 */
export function mapearProductoADsProduct(p: ProductResponse, opciones: OpcionesDeMapeo = {}): DsProduct {
    return {
        id: p.id,
        name: p.nombre,
        now: p.precioBase,
        was: p.originalPrice,
        rating: p.rating,
        sold: p.salesCount,
        stock: p.stock,
        badge: insigniaDeProducto(p, opciones.badgeDeSeccion),
        tag: p.starSeller ? 'Recomendado' : undefined,
        shipFree: (p.precioBase ?? 0) >= ENVIO_GRATIS_DESDE,
        image: urlDeImagenPrincipal(p.imagenes),
        ...opciones.extra,
    };
}

function insigniaDeProducto(p: ProductResponse, badgeDeSeccion: string | undefined): string | undefined {
    const pocasUnidades = p.stock !== undefined && p.stock <= STOCK_BAJO ? 'POCAS' : undefined;
    return p.promocionEtiqueta ?? p.badge ?? badgeDeSeccion ?? (p.discount || undefined) ?? pocasUnidades;
}

function urlDeImagenPrincipal(imagenes: ProductResponse['imagenes']): string | undefined {
    return imagenes?.find((img) => img.esPrincipal)?.url || imagenes?.[0]?.url;
}
