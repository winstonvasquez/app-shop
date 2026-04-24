import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard para rutas administrativas (/admin, /pos, /contabilidad, etc.).
 * Bloquea usuarios no autenticados (→ /auth/login) y clientes (→ /home).
 */
export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/auth/login']);
    }

    // Si tiene rol CUSTOMER, no puede acceder a rutas administrativas
    if (authService.isCustomer()) {
        return router.createUrlTree(['/home']);
    }

    return true;
};
