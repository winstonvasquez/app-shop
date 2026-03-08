import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
    const translateService = inject(TranslateService);
    const currentLang = translateService.currentLang || translateService.getDefaultLang() || 'es';

    const clonedReq = req.clone({
        setHeaders: {
            'Accept-Language': currentLang
        }
    });

    return next(clonedReq);
};
