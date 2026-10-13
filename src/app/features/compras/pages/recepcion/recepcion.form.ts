import { CreateRecepcionRequest } from '../../services/recepcion.service';

/** Línea del formulario de recepción (estado local del componente, no del backend). */
export interface RecepcionItemForm {
    ordenItemId: string;
    productoNombre: string;
    cantidadPedida: number;
    cantidadRecibida: number;
}

/**
 * Forma cruda de `recepcionForm.value`. Los controles son nullables.
 */
export interface ValoresFormularioRecepcion {
    ordenCompraId?: string | null;
    numeroGuia?: string | null;
    transportista?: string | null;
    fechaRecepcion?: string | null;
    responsable?: string | null;
    almacenDestino?: string | null;
    observaciones?: string | null;
}

/**
 * Traduce el formulario al request de alta de recepción de mercadería.
 *
 * Salvo la OC, TODO es opcional y viaja ausente si está vacío: una recepción se
 * puede registrar con lo mínimo (qué OC y qué llegó) y completar después los datos
 * de la guía. Mandar `''` en vez de omitir sobrescribiría con vacío un dato que
 * quizá ya venía de la OC —`almacenDestino` en particular, que el componente
 * precarga desde la orden— y dejaría la recepción sin almacén.
 *
 * De cada línea solo viajan `ordenItemId` y `cantidadRecibida`: el nombre y la
 * cantidad pedida son contexto para el usuario, y el backend los resuelve por la OC.
 */
export function construirCreateRecepcionRequest(
    fv: ValoresFormularioRecepcion,
    items: RecepcionItemForm[]
): CreateRecepcionRequest {
    return {
        ordenCompraId: fv.ordenCompraId ?? '',
        numeroGuia: fv.numeroGuia || undefined,
        transportista: fv.transportista || undefined,
        fechaRecepcion: fv.fechaRecepcion || undefined,
        responsable: fv.responsable || undefined,
        almacenDestino: fv.almacenDestino || undefined,
        observaciones: fv.observaciones || undefined,
        items: items.map((i) => ({ ordenItemId: i.ordenItemId, cantidadRecibida: i.cantidadRecibida })),
    };
}

/**
 * Color del estado de la recepción. Pendiente avisa que falta confirmar; conforme
 * y completada cierran en verde. `CON_DIFERENCIAS` y `DIFERENCIA` conviven porque
 * el backend emite ambas variantes del mismo desenlace.
 */
export function claseBadgeEstadoRecepcion(estado: string): string {
    const mapa: Record<string, string> = {
        PENDIENTE: 'warning',
        CONFORME: 'success',
        CON_DIFERENCIAS: 'error',
        DIFERENCIA: 'error',
        COMPLETADA: 'success'
    };
    return mapa[estado] ?? 'neutral';
}
