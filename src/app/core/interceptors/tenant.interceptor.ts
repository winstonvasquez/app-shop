import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { longToSyntheticUuid } from '@core/utils/synthetic-uuid.util';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
    const document = inject(DOCUMENT);
    const authService = inject(AuthService);
    const hostname = document.location.hostname;

    const headers: Record<string, string> = {
        'X-Tenant-Domain': hostname
    };

    const user = authService.currentUser();
    if (user?.activeCompanyId) {
        headers['X-Company-Id'] = longToSyntheticUuid(user.activeCompanyId);
        headers['X-Tenant-ID'] = String(user.activeCompanyId);
    }

    const clonedReq = req.clone({ setHeaders: headers });
    return next(clonedReq);
};
