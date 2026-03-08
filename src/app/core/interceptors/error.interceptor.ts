import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timeout } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        retry({ count: 2, delay: 1000 }),
        timeout(30000),
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'Error desconocido';
            
            if (error.error instanceof ErrorEvent) {
                // Error del lado del cliente
                errorMessage = `Error: ${error.error.message}`;
            } else {
                // Error del lado del servidor
                errorMessage = `Código: ${error.status}, Mensaje: ${error.message}`;
            }
            
            console.error('HTTP Error:', errorMessage);
            return throwError(() => new Error(errorMessage));
        })
    );
};
