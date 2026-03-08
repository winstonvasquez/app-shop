import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { STORAGE_KEYS } from '@shared/constants/app.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const tenantId = localStorage.getItem(STORAGE_KEYS.tenantId);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        ...(tenantId && { 'X-Tenant-ID': tenantId }),
      },
    });
  }

  return next(req);
};
