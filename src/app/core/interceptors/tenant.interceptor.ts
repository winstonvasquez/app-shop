import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';

/** Converts a numeric company ID to a zero-padded UUID string */
function toCompanyUuid(numericId: number): string {
    const hex = numericId.toString(16).padStart(12, '0');
    return `00000000-0000-0000-0000-${hex}`;
}

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
    const document = inject(DOCUMENT);
    const authService = inject(AuthService);
    const hostname = document.location.hostname;

    const headers: Record<string, string> = {
        'X-Tenant-Domain': hostname
    };

    const user = authService.currentUser();
    if (user?.activeCompanyId) {
        headers['X-Company-Id'] = toCompanyUuid(user.activeCompanyId);
        headers['X-Tenant-ID'] = String(user.activeCompanyId);
    }

    const clonedReq = req.clone({ setHeaders: headers });
    return next(clonedReq);
};
