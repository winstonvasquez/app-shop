import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Fail-CLOSED (mismo patrón que moduleGuard): sin sesión o sin SUPERADMIN, fuera. */
export const superAdminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.currentUser()) {
        return router.createUrlTree(['/auth/login']);
    }
    if (authService.isSuperAdmin()) return true;
    return router.createUrlTree(['/admin']);
};
