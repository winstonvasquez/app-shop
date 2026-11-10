import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

/**
 * Operador de los servicios de inventario/logística: el `Error.message` que llega a la vista es el
 * texto en español del backend (`mensajeDeErrorHttp`), no el «Http failure response for …» de Angular.
 * Errores que no son HTTP (un bug en un `map`) pasan intactos.
 */
export const mapHttpError = <T>() =>
    catchError<T, Observable<never>>((e: unknown) =>
        throwError(() => (e instanceof HttpErrorResponse ? new Error(mensajeDeErrorHttp(e)) : e)));
