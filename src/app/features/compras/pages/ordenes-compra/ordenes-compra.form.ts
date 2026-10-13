import { MONEDA } from '@shared/constants/sunat.constants';
import { OrdenCompra, OrdenCompraItem } from '../../models/orden-compra.model';

/** Línea del formulario de OC (estado local del componente, no del backend). */
export interface OcItemForm {
    productoId?: string;
    productoNombre: string;
    sku: string;
    cantidad: number;
    precioUnitario: number;
}

/**
 * Forma cruda de `ocForm.getRawValue()`. Los controles que `reset()` no repuebla
 * (`fechaEntregaEstimada`, `observaciones`) llegan en `null`, no en `''`.
 */
export interface ValoresFormularioOrdenCompra {
    codigo?: string | null;
    proveedorId?: string | null;
    fechaEmision?: string | null;
    fechaEntregaEstimada?: string | null;
    condicionPago?: string | null;
    almacenDestino?: string | null;
    observaciones?: string | null;
    contratoId?: string | null;
    moneda?: string | null;
    tipoCambio?: number | null;
}

/** Totales calculados de la OC (ver el `computed` `totales` del componente). */
export interface TotalesOrdenCompra {
    subtotal: number;
    igv: number;
    total: number;
}

/**
 * Regla de captura: una línea de OC solo sirve si identifica el producto, pide al
 * menos una unidad y tiene precio. El precio debe ser ESTRICTAMENTE positivo — a
 * diferencia de una factura, una OC con precio 0 no es una bonificación sino una
 * línea sin cotizar, y comprometería presupuesto por S/ 0.
 */
export function itemsOrdenIncompletos(items: OcItemForm[]): boolean {
    return items.some((i) => !i.productoNombre.trim() || i.cantidad < 1 || i.precioUnitario <= 0);
}

/**
 * Traduce el formulario de OC al payload de alta/edición.
 *
 * Tres reglas de negocio codificadas aquí:
 * - `codigo` se DESCARTA: el correlativo lo emite el backend, y reenviarlo en una
 *   edición permitiría reapuntarlo desde el cliente.
 * - `tipoCambio` solo viaja cuando la moneda NO es PEN. En soles no hay conversión
 *   que aplicar, y mandarlo dejaría un tipo de cambio guardado que nadie usa pero
 *   que los reportes sí leerían.
 * - `contratoId` vacío significa «OC suelta, sin contrato marco»: viaja ausente,
 *   no como cadena vacía, que el backend intentaría resolver como UUID.
 *
 * El subtotal por línea se recalcula aquí (cantidad × precio) en vez de confiar en
 * lo que traiga el formulario.
 */
export function construirPayloadOrdenCompra(
    valores: ValoresFormularioOrdenCompra,
    items: OcItemForm[],
    totales: TotalesOrdenCompra
): Partial<OrdenCompra> {
    const { codigo: _codigo, ...resto } = valores;
    const moneda: string = resto.moneda || MONEDA.PEN;
    return {
        // `resto` puede traer null en los controles que `reset()` no repuebla; viaja
        // tal cual al backend, que trata null y ausente por igual.
        ...(resto as unknown as Partial<OrdenCompra>),
        contratoId: resto.contratoId || undefined,
        moneda,
        tipoCambio: moneda !== MONEDA.PEN ? (resto.tipoCambio ?? undefined) : undefined,
        subtotal: totales.subtotal,
        igv: totales.igv,
        total: totales.total,
        items: items.map((i) => ({
            productoId: i.productoId || undefined,
            productoNombre: i.productoNombre,
            sku: i.sku || undefined,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal: i.cantidad * i.precioUnitario
        } as OrdenCompraItem))
    };
}

/** Valores de la cabecera del drawer de edición de OC. */
export interface ValoresEdicionOrdenCompra {
    codigo: string;
    proveedorId: string;
    fechaEmision: string;
    fechaEntregaEstimada: string;
    condicionPago: string;
    almacenDestino: string;
    observaciones: string;
    contratoId: string;
    moneda: string;
    tipoCambio: number | null;
}

/**
 * Cabecera al reabrir una OC para editar. Los opcionales caen a vacío y la moneda
 * a PEN —el default del alta— para que una OC antigua sin moneda registrada no
 * abra con el select en blanco y acabe guardándose sin moneda.
 *
 * `tipoCambio` cae a `null` y no a `0`: el control es numérico y un 0 se leería
 * como un tipo de cambio real de 0, que invalidaría los importes en moneda extranjera.
 */
export function valoresEdicionOrdenCompra(orden: OrdenCompra): ValoresEdicionOrdenCompra {
    return {
        codigo: orden.codigo,
        proveedorId: orden.proveedorId,
        fechaEmision: orden.fechaEmision,
        fechaEntregaEstimada: orden.fechaEntregaEstimada ?? '',
        condicionPago: orden.condicionPago,
        almacenDestino: orden.almacenDestino,
        observaciones: orden.observaciones ?? '',
        contratoId: orden.contratoId ?? '',
        moneda: orden.moneda ?? MONEDA.PEN,
        tipoCambio: orden.tipoCambio ?? null
    };
}

/**
 * Líneas al reabrir una OC. Solo el `sku` necesita default porque el formulario lo
 * trata como texto obligatorio; `productoId` se deja tal cual (incluido undefined)
 * porque `construirPayloadOrdenCompra` ya lo omite si viene vacío.
 */
export function lineasEdicionOrdenCompra(orden: OrdenCompra): OcItemForm[] {
    return (orden.items ?? []).map((i) => ({
        productoId: i.productoId,
        productoNombre: i.productoNombre,
        sku: i.sku ?? '',
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario
    }));
}

/**
 * Color del estado de la OC en el listado. Recorre el ciclo borrador → pendiente →
 * aprobada → enviada → recibida; cancelada es la única salida en rojo. Un estado
 * no contemplado se pinta neutro en vez de romper la fila.
 */
export function claseBadgeEstadoOrden(estado: string): string {
    const mapa: Record<string, string> = {
        BORRADOR: 'neutral',
        PENDIENTE: 'warning',
        APROBADA: 'success',
        ENVIADA: 'accent',
        RECIBIDA: 'success',
        CANCELADA: 'error'
    };
    return mapa[estado] ?? 'neutral';
}
