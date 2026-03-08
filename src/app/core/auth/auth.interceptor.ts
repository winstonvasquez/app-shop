import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '@env/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if request is to our API
    const isApiUrl = Object.values(environment.apiUrls).some(url => req.url.includes(url));
    const token = authService.getToken();

    // Add auth token to request if it's an API request and we have a token
    if (token && isApiUrl) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    // Handle 401 errors
    return next(req).pipe(
        catchError(error => {
            if (error.status === 401) {
                authService.logout();
            }
            return throwError(() => error);
        })
    );
};
