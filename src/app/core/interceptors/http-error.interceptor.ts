import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '@shared/services/notification.service';
import { TranslationService } from '@shared/services/translation.service';
import { HTTP_STATUS } from '@shared/constants/app.constants';
import { API_ERRORS } from '@shared/constants/api.constants';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const translationService = inject(TranslationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let messageKey = 'errors.unknown';
      let errorType: typeof API_ERRORS[keyof typeof API_ERRORS] = API_ERRORS.unknown;

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        messageKey = 'errors.network';
        errorType = API_ERRORS.network;
      } else {
        // Error del lado del servidor
        switch (error.status) {
          case HTTP_STATUS.unauthorized:
            messageKey = 'errors.unauthorized';
            errorType = API_ERRORS.unauthorized;
            break;
          case HTTP_STATUS.forbidden:
            messageKey = 'errors.forbidden';
            errorType = API_ERRORS.forbidden;
            break;
          case HTTP_STATUS.notFound:
            messageKey = 'errors.notFound';
            errorType = API_ERRORS.notFound;
            break;
          case HTTP_STATUS.badRequest:
            messageKey = 'errors.validation';
            errorType = API_ERRORS.validationError;
            break;
          case HTTP_STATUS.internalServerError:
          case HTTP_STATUS.serviceUnavailable:
            messageKey = 'errors.server';
            errorType = API_ERRORS.serverError;
            break;
          case 0:
            messageKey = 'errors.timeout';
            errorType = API_ERRORS.timeout;
            break;
          default:
            messageKey = 'errors.unknown';
            errorType = API_ERRORS.unknown;
        }
      }

      // Si el backend devuelve un mensaje traducido, usarlo
      const backendMessage = error.error?.messageTranslated || error.error?.message;
      const backendMessageKey = error.error?.messageKey;

      if (backendMessageKey) {
        messageKey = backendMessageKey;
      }

      // Mostrar notificación de error
      notificationService.showError(
        messageKey,
        backendMessage || translationService.instant(messageKey)
      );

      // Re-lanzar el error con información adicional
      return throwError(() => ({
        ...error,
        errorType,
        messageKey,
        messageTranslated: backendMessage || translationService.instant(messageKey),
      }));
    })
  );
};
