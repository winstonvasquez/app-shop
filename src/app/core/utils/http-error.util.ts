import { HttpErrorResponse } from '@angular/common/http';
import { HTTP_STATUS } from '@shared/constants/app.constants';

/**
 * Traducción única de un error HTTP a texto para el usuario.
 *
 * Antes esta tabla estaba escrita **doce veces**: una por cada `handleError` privado de servicio
 * (todos con la misma cadena de `else if` sobre `error.status`) y otra más, con textos distintos,
 * dentro de `httpErrorInterceptor` —que era la función de peor CRAP de todo el frontend (CC 29)—.
 * Al haber doce copias, los mensajes ya habían divergido sin que nadie lo decidiera.
 *
 * Ahora hay UNA tabla. Lo que de verdad cambia entre servicios son dos frases —qué es un 404 y qué
 * es un 409 en ese dominio— y eso se pasa como `personalizados`, no se duplica la cadena entera.
 */

/** Texto por defecto de cada estado. El 0 es «no hubo respuesta»: red caída o CORS. */
const MENSAJES: Readonly<Record<number, string>> = {
    0: 'No se pudo conectar con el servidor',
    [HTTP_STATUS.badRequest]: 'Datos inválidos',
    [HTTP_STATUS.unauthorized]: 'Tu sesión expiró, inicia sesión nuevamente',
    [HTTP_STATUS.forbidden]: 'No tienes acceso a este recurso',
    [HTTP_STATUS.notFound]: 'El recurso solicitado no existe',
    [HTTP_STATUS.conflict]: 'Ya existe un registro con esos datos',
    422: 'Los datos enviados no son válidos',
    [HTTP_STATUS.internalServerError]: 'Ocurrió un error interno, intenta más tarde',
    [HTTP_STATUS.serviceUnavailable]: 'Ocurrió un error interno, intenta más tarde',
};

/** Título corto para el toast. Sólo lo usa el interceptor. */
const TITULOS: Readonly<Record<number, string>> = {
    0: 'Sin conexión',
    [HTTP_STATUS.badRequest]: 'Datos inválidos',
    [HTTP_STATUS.unauthorized]: 'No autorizado',
    [HTTP_STATUS.forbidden]: 'Sin permiso',
    [HTTP_STATUS.notFound]: 'No encontrado',
    [HTTP_STATUS.conflict]: 'Conflicto',
    422: 'Error de validación',
    [HTTP_STATUS.internalServerError]: 'Error del servidor',
    [HTTP_STATUS.serviceUnavailable]: 'Error del servidor',
};

/** Detalle que manda el backend (ProblemDetail RFC 7807, o el `message` de los servicios viejos). */
export function detalleDelBackend(error: HttpErrorResponse): string | undefined {
    const e = error.error as { detail?: string; message?: string; messageTranslated?: string } | null;
    return e?.detail ?? e?.message ?? e?.messageTranslated ?? undefined;
}

const esErrorDeCliente = (error: HttpErrorResponse) => error.error instanceof ErrorEvent;

/**
 * Mensaje para el usuario. `personalizados` sustituye el texto por defecto de los estados que ese
 * dominio quiera matizar, típicamente 404 y 409 («La categoría ya existe», «Usuario no encontrado»).
 *
 * Precedencia: personalizado del dominio → detalle del backend → texto por defecto. El dominio va
 * primero a propósito: «El RUC ya está registrado» le dice más al usuario que el texto genérico
 * que devuelva el servidor.
 */
export function mensajeDeErrorHttp(
    error: HttpErrorResponse,
    personalizados: Readonly<Record<number, string>> = {},
): string {
    if (esErrorDeCliente(error)) return `Error: ${(error.error as ErrorEvent).message}`;
    return personalizados[error.status]
        ?? detalleDelBackend(error)
        ?? MENSAJES[error.status]
        ?? `Error ${error.status}: ${error.statusText}`;
}

/** Título y mensaje del toast. Misma tabla que `mensajeDeErrorHttp`, para que no puedan divergir. */
export function tituloYMensajeDeError(error: HttpErrorResponse): { titulo: string; mensaje: string } {
    if (esErrorDeCliente(error)) {
        return { titulo: 'Error de red', mensaje: 'No se pudo conectar con el servidor' };
    }
    return {
        titulo: TITULOS[error.status] ?? `Error ${error.status}`,
        // El 0 es el único estado cuyo texto NO puede venir del backend: no hubo respuesta.
        mensaje: (error.status === 0 ? undefined : detalleDelBackend(error))
            ?? MENSAJES[error.status]
            ?? 'Ocurrió un error inesperado',
    };
}
