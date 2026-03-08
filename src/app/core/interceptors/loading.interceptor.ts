import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '@core/services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Incrementar contador de peticiones activas
  loadingService.show();

  return next(req).pipe(
    finalize(() => {
      // Decrementar contador cuando la petición termine
      loadingService.hide();
    })
  );
};
