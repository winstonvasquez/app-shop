import { CotizacionItemRequest, CrearCotizacionRequest } from '../../models/cotizacion.model';

/**
 * Forma cruda de `cotizacionForm.getRawValue()`. Los controles son nullables y el
 * array de ítems llega sin tipar desde el `FormArray`.
 */
export interface ValoresFormularioCotizacion {
    titulo?: string | null;
    descripcion?: string | null;
    fechaVencimiento?: string | null;
    proveedorIds?: (string | null)[] | null;
    items?: Record<string, unknown>[] | null;
}

/**
 * Líneas del pedido de cotización. Lo que se cotiza es QUÉ y CUÁNTO, no a qué
 * precio: no hay campo de precio porque el precio es justamente la respuesta que
 * se le pide al proveedor.
 *
 * `|| undefined` en los opcionales: una cadena vacía no es dato sino «no llenado»,
 * y debe viajar ausente. `unidadMedida` es la excepción — cae a UNIDAD, porque una
 * cantidad sin unidad no es cotizable y UNIDAD es el default del alta.
 */
export function construirItemsCotizacion(items: Record<string, unknown>[]): CotizacionItemRequest[] {
    return items.map((i) => ({
        productoId: (i['productoId'] as string) || undefined,
        productoNombre: i['productoNombre'] as string,
        sku: (i['sku'] as string) || undefined,
        cantidad: Number(i['cantidad']),
        unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
        especificaciones: (i['especificaciones'] as string) || undefined,
    }));
}

/**
 * Traduce el formulario al request de cotización. Sirve para el alta y para la
 * edición: `CrearCotizacionRequest` y `ActualizarCotizacionRequest` tienen la misma
 * forma, y en ambos casos `items` y `proveedorIds` REEMPLAZAN la lista completa
 * (la edición solo se permite en estado CREADA, donde ningún invitado respondió aún).
 *
 * `proveedorIds` se filtra de huecos: el multi-select puede dejar entradas vacías al
 * quitar un proveedor, y un id vacío haría que el backend invite a un proveedor
 * inexistente.
 *
 * `codigo` no aparece en el request a propósito: el correlativo lo emite el backend.
 */
export function construirCotizacionRequest(fv: ValoresFormularioCotizacion): CrearCotizacionRequest {
    return {
        titulo: fv.titulo ?? '',
        descripcion: fv.descripcion ?? undefined,
        fechaVencimiento: fv.fechaVencimiento ?? '',
        proveedorIds: (fv.proveedorIds ?? []).filter((id): id is string => !!id),
        items: construirItemsCotizacion(fv.items ?? []),
    };
}

/**
 * Color del estado de la cotización. Recorre creada → enviada → en respuesta →
 * adjudicada → convertida en OC; adjudicada y convertida son ambas verdes porque
 * las dos son un desenlace exitoso. Cancelada es la única roja.
 */
export function claseBadgeEstadoCotizacion(estado: string): string {
    const mapa: Record<string, string> = {
        CREADA: 'badge badge-neutral',
        ENVIADA: 'badge badge-accent',
        EN_RESPUESTA: 'badge badge-warning',
        ADJUDICADA: 'badge badge-success',
        CONVERTIDA_OC: 'badge badge-success',
        CANCELADA: 'badge badge-error',
    };
    return mapa[estado] ?? 'badge badge-neutral';
}
