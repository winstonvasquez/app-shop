import { CrearDevolucionRequest } from '../../models/devolucion.model';

/**
 * Forma cruda de `devolucionForm.value`. Los controles son nullables y el array de
 * ítems llega sin tipar desde el `FormArray`.
 */
export interface ValoresFormularioDevolucion {
    ordenCompraId?: string | null;
    recepcionId?: string | null;
    motivo?: string | null;
    tipo?: string | null;
    observaciones?: string | null;
    items?: Record<string, unknown>[] | null;
}

/**
 * Traduce el formulario al request de devolución a proveedor.
 *
 * `recepcionId` es opcional a propósito: se puede devolver contra una recepción
 * concreta (lo normal, porque acota qué se recibió) o contra la OC entera cuando
 * la mercadería aún no se registró como recibida. Vacío significa «sin recepción»,
 * y debe viajar ausente, no como cadena vacía que el backend intentaría resolver
 * como UUID.
 *
 * `motivoItem` es la nota por línea y `motivo` es el de la cabecera: una devolución
 * puede tener una causa general y matices por producto, así que no se copia uno en
 * el otro.
 */
export function construirCrearDevolucionRequest(fv: ValoresFormularioDevolucion): CrearDevolucionRequest {
    return {
        ordenCompraId: fv.ordenCompraId ?? '',
        recepcionId: fv.recepcionId || undefined,
        motivo: fv.motivo ?? '',
        tipo: fv.tipo ?? 'DEVOLUCION',
        observaciones: fv.observaciones || undefined,
        items: (fv.items ?? []).map((i) => ({
            ordenItemId: (i['ordenItemId'] as string) || undefined,
            productoNombre: i['productoNombre'] as string,
            sku: (i['sku'] as string) || undefined,
            cantidad: Number(i['cantidad']),
            motivoItem: (i['motivoItem'] as string) || undefined,
        })),
    };
}

/**
 * Color del estado de la devolución. Recorre borrador → enviada → aceptada →
 * completada; aceptada sigue en ámbar porque el proveedor aceptó pero la nota de
 * crédito todavía no llegó, y solo completada cierra en verde.
 */
export function claseBadgeEstadoDevolucion(estado: string | undefined): string {
    const mapa: Record<string, string> = {
        BORRADOR: 'badge badge-neutral',
        ENVIADA: 'badge badge-accent',
        ACEPTADA: 'badge badge-warning',
        COMPLETADA: 'badge badge-success',
        RECHAZADA: 'badge badge-error',
    };
    return (estado && mapa[estado]) || 'badge badge-neutral';
}
