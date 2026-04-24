import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ModalStateService } from '@core/services/modal-state.service';

/**
 * Guard para rutas que requieren un cliente autenticado (ej: /checkout).
 * Si el usuario no está autenticado, guarda la URL de retorno en sessionStorage,
 * abre el AuthModal y redirige a /home.
 * Si está autenticado pero es admin, redirige a /admin/dashboard.
 */
export const customerGuard: CanActivateFn = (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const modalState = inject(ModalStateService);

    if (!auth.isAuthenticated()) {
        // Guardar returnUrl para redirigir tras login
        const returnUrl = '/' + (route.url.map(s => s.path).join('/') || '');
        sessionStorage.setItem('returnUrl', returnUrl);
        // Abrir modal de autenticación
        modalState.openAuthModal();
        return router.createUrlTree(['/home']);
    }

    // Admins no deben usar la tienda como clientes
    if (auth.isAdmin() && !auth.isCustomer()) {
        return router.createUrlTree(['/admin/dashboard']);
    }

    return true;
};
