import { SolicitudCompra, SolicitudCompraItem } from '../../models/solicitud-compra.model';

/**
 * Forma cruda de `solicitudForm.value` / `.getRawValue()`. Los controles son
 * nullables y el array de ítems llega sin tipar desde el `FormArray`.
 */
export interface ValoresFormularioSolicitud {
    justificacion?: string | null;
    departamento?: string | null;
    prioridad?: string | null;
    fechaRequerida?: string | null;
    items?: Record<string, unknown>[] | null;
}

/**
 * Líneas de la solicitud de compra.
 *
 * `productoId` y `proveedorSugeridoId` NO tienen input en el alta, pero se
 * preservan porque la edición sí los arrastra: si viajaran nulos, `actualizar()`
 * los borraría al reconstruir los ítems, y `convertirAOC` los propaga tal cual
 * hasta Recepción — que es la causa raíz del NPE por `productoId` null.
 *
 * `precioEstimado` distingue ausencia de cero con un ternario y no con `||`: es
 * una estimación opcional, y `0` no es un precio válido que quepa distinguir aquí,
 * pero sí hay que evitar mandar `NaN` cuando el campo está vacío.
 */
export function construirItemsSolicitud(items: Record<string, unknown>[]): SolicitudCompraItem[] {
    return items.map((i) => ({
        productoId: (i['productoId'] as string) || undefined,
        proveedorSugeridoId: (i['proveedorSugeridoId'] as string) || undefined,
        productoNombre: i['productoNombre'] as string,
        sku: i['sku'] as string | undefined,
        cantidad: Number(i['cantidad']),
        unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
        precioEstimado: i['precioEstimado'] ? Number(i['precioEstimado']) : undefined,
        observaciones: i['observaciones'] as string | undefined,
    }));
}

/**
 * Payload de EDICIÓN. No incluye `departamento` ni `solicitanteNombre`:
 * `ActualizarSolicitudRequest` no los acepta — el área y el solicitante se fijan
 * al crear y no se reasignan editando.
 */
export function construirPayloadEdicionSolicitud(fv: ValoresFormularioSolicitud): Partial<SolicitudCompra> {
    return {
        justificacion: fv.justificacion ?? '',
        prioridad: fv.prioridad ?? 'NORMAL',
        fechaRequerida: fv.fechaRequerida ?? undefined,
        items: construirItemsSolicitud(fv.items ?? []),
    };
}

/**
 * Payload de ALTA: lo mismo que la edición más los dos campos que solo se fijan al
 * crear. `solicitanteNombre` viene del usuario autenticado, no del formulario, para
 * que nadie pueda solicitar a nombre de otro.
 */
export function construirPayloadAltaSolicitud(
    fv: ValoresFormularioSolicitud,
    solicitanteNombre: string
): Partial<SolicitudCompra> {
    return {
        solicitanteNombre,
        departamento: fv.departamento ?? undefined,
        ...construirPayloadEdicionSolicitud(fv),
    };
}

/** Valores de la cabecera del drawer de edición. Ningún campo es opcional: el
 *  formulario reactivo necesita un valor concreto por control. */
export interface ValoresCabeceraSolicitud {
    justificacion: string;
    departamento: string;
    prioridad: string;
    fechaRequerida: string;
}

/**
 * Cabecera al reabrir una solicitud para editar. Los defaults son los del alta
 * (prioridad NORMAL, resto vacío) para que una solicitud antigua sin estos campos
 * no abra con controles nulos, que Angular pinta como «sin elegir» y al guardar
 * borrarían el dato.
 */
export function valoresCabeceraSolicitud(solicitud: SolicitudCompra): ValoresCabeceraSolicitud {
    return {
        justificacion: solicitud.justificacion ?? '',
        departamento: solicitud.departamento ?? '',
        prioridad: solicitud.prioridad ?? 'NORMAL',
        fechaRequerida: solicitud.fechaRequerida ?? '',
    };
}

/** Valores de una línea del drawer de edición. */
export interface ValoresLineaSolicitud {
    productoId: string;
    proveedorSugeridoId: string;
    productoNombre: string;
    sku: string;
    cantidad: number;
    unidadMedida: string;
    precioEstimado: number | null;
    observaciones: string;
}

/**
 * Línea al reabrir una solicitud. `productoId` y `proveedorSugeridoId` se rellenan
 * aunque no tengan input visible: son los que `construirItemsSolicitud` vuelve a
 * mandar al guardar, y si el form no los cargara se perderían en cada edición.
 *
 * `precioEstimado` cae a `null` y no a `0`: el control es numérico y `0` se
 * mostraría como un precio estimado de S/ 0 que el usuario no puso.
 */
export function valoresLineaSolicitud(item: SolicitudCompraItem): ValoresLineaSolicitud {
    return {
        productoId: item.productoId ?? '',
        proveedorSugeridoId: item.proveedorSugeridoId ?? '',
        productoNombre: item.productoNombre ?? '',
        sku: item.sku ?? '',
        cantidad: item.cantidad ?? 1,
        unidadMedida: item.unidadMedida ?? 'UNIDAD',
        precioEstimado: item.precioEstimado ?? null,
        observaciones: item.observaciones ?? '',
    };
}

/**
 * Color del estado de la solicitud. Solo la aprobación pendiente avisa en ámbar;
 * borrador y cancelada son neutras porque ninguna exige acción del aprobador, y
 * convertida en OC se distingue en `accent` por ser el final del ciclo.
 */
export function claseBadgeEstadoSolicitud(estado: string | undefined): string {
    const mapa: Record<string, string> = {
        BORRADOR: 'badge badge-neutral',
        PENDIENTE_APROBACION: 'badge badge-warning',
        APROBADA: 'badge badge-success',
        RECHAZADA: 'badge badge-error',
        CONVERTIDA_OC: 'badge badge-accent',
        CANCELADA: 'badge badge-neutral',
    };
    return (estado && mapa[estado]) || 'badge badge-neutral';
}
