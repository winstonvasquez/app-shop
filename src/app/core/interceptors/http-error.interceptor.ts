import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@shared/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { tituloYMensajeDeError } from '@core/utils/http-error.util';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const toast = inject(ToastService);
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (esSilencioso(error, req.url, authService.isAuthenticated())) {
                return throwError(() => error);
            }
            const { titulo, mensaje } = tituloYMensajeDeError(error);
            toast.error(titulo, mensaje);
            return throwError(() => error);
        })
    );
};

/** Errores esperados que NO deben molestar al usuario con un toast. */
function esSilencioso(error: HttpErrorResponse, url: string, autenticado: boolean): boolean {
    // Los endpoints de parámetros opcionales responden 404 cuando el parámetro no está configurado.
    if (error.status === HTTP_STATUS.notFound && url.includes('/parametros')) return true;
    // Los diálogos de PIN (supervisor y desbloqueo del POS) muestran su propio error (PIN erróneo, 429).
    if (url.includes('/pos/autorizaciones') || url.includes('/auth/pin-login')) return true;
    // 401/403 con la sesión ya cerrada: peticiones en vuelo o polling de fondo al hacer logout.
    const noAutorizado = error.status === HTTP_STATUS.unauthorized || error.status === HTTP_STATUS.forbidden;
    return noAutorizado && !autenticado;
}
