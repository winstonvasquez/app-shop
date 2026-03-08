import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
    // We use DOCUMENT to safely access the window/location object in SSR environments if needed
    const document = inject(DOCUMENT);
    const hostname = document.location.hostname;

    const clonedReq = req.clone({
        setHeaders: {
            'X-Tenant-Domain': hostname
        }
    });

    return next(clonedReq);
};
