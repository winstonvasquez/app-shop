import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '@shared/services/toast.service';
import { AuthService } from '@core/auth/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
    const toast = inject(ToastService);
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Errores 404 silenciosos en endpoints de parámetros opcionales
            if (error.status === 404 && req.url.includes('/parametros')) {
                return throwError(() => error);
            }

            // Si el usuario ya no está autenticado, los 401/403 son esperados
            // (polling en background, requests en vuelo al cerrar sesión) — no mostrar toast
            if ((error.status === 401 || error.status === 403) && !authService.isAuthenticated()) {
                return throwError(() => error);
            }

            let title = 'Error';
            let message: string | undefined;

            // Mensaje personalizado del backend (ProblemDetail RFC 7807)
            const backendDetail: string | undefined =
                error.error?.detail ?? error.error?.message ?? error.error?.messageTranslated;

            if (error.error instanceof ErrorEvent) {
                title = 'Error de red';
                message = 'No se pudo conectar con el servidor';
            } else {
                switch (error.status) {
                    case 400:
                        title = 'Datos inválidos';
                        message = backendDetail ?? 'Verifica los campos del formulario';
                        break;
                    case 401:
                        title = 'No autorizado';
                        message = backendDetail ?? 'Tu sesión expiró, inicia sesión nuevamente';
                        break;
                    case 403:
                        title = 'Sin permiso';
                        message = backendDetail ?? 'No tienes acceso a este recurso';
                        break;
                    case 404:
                        title = 'No encontrado';
                        message = backendDetail ?? 'El recurso solicitado no existe';
                        break;
                    case 409:
                        title = 'Conflicto';
                        message = backendDetail ?? 'Ya existe un registro con esos datos';
                        break;
                    case 422:
                        title = 'Error de validación';
                        message = backendDetail ?? 'Los datos enviados no son válidos';
                        break;
                    case 500:
                    case 503:
                        title = 'Error del servidor';
                        message = backendDetail ?? 'Ocurrió un error interno, intenta más tarde';
                        break;
                    case 0:
                        title = 'Sin conexión';
                        message = 'Verifica tu conexión a internet';
                        break;
                    default:
                        title = `Error ${error.status}`;
                        message = backendDetail ?? 'Ocurrió un error inesperado';
                }
            }

            toast.error(title, message);
            return throwError(() => error);
        })
    );
};
