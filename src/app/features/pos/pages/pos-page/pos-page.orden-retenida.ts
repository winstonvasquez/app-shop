import { CartItem } from '../../models/catalogo-pos.model';

/**
 * Líneas de carrito guardadas en `itemsJson` al retener una orden (`JSON.stringify(carrito.items())`).
 * Se devuelven tal cual —con descuento de línea, `autorizadoPor` y bolsas ICBPER— para que recuperar
 * la orden no pierda nada; los campos que falten en payloads antiguos toman su valor neutro.
 * Devuelve null si el JSON no es una lista de líneas utilizable.
 */
export function itemsDeOrdenRetenida(itemsJson: string): CartItem[] | null {
    let raw: unknown;
    try {
        raw = JSON.parse(itemsJson);
    } catch {
        return null;
    }
    if (!Array.isArray(raw)) return null;
    const items: CartItem[] = [];
    for (const r of raw as Partial<CartItem>[]) {
        if (!r?.variante || typeof r.cantidad !== 'number') return null;
        items.push({
            descuentoTipo: 'NINGUNO', descuentoValor: 0, descuentoMonto: 0, autorizadoPor: null, bolsas: 0,
            subtotal: r.cantidad * r.variante.precioFinal,
            ...r,
            variante: r.variante,
            cantidad: r.cantidad,
        });
    }
    return items;
}
