import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function moduleGuard(moduleCode: string): CanActivateFn {
    return () => {
        const authService = inject(AuthService);
        const router = inject(Router);
        const modules = authService.enabledModules();
        // If no modules loaded (backward compat), allow all
        if (modules.length === 0) return true;
        if (modules.includes(moduleCode)) return true;
        return router.createUrlTree(['/portal/upgrade']);
    };
}
