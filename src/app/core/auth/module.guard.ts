import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function moduleGuard(moduleCode: string): CanActivateFn {
    return () => {
        const authService = inject(AuthService);
        const router = inject(Router);
        // Hardening 2026-05-28 (CRIT-11): fail-CLOSED. Antes, sin módulos en el JWT
        // se permitía TODO (fail-open) → un token sin claim 'modules' daba acceso total.
        if (!authService.currentUser()) {
            return router.createUrlTree(['/auth/login']);
        }
        const modules = authService.enabledModules();
        if (modules.includes(moduleCode)) return true;
        return router.createUrlTree(['/portal/upgrade']);
    };
}
