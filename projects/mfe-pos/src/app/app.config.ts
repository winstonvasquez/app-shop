import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import {
    authInterceptor,
    httpErrorInterceptor,
    loadingInterceptor,
    tenantInterceptor,
    languageInterceptor,
} from '@microshop/auth-lib';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([
                authInterceptor,
                tenantInterceptor,
                languageInterceptor,
                loadingInterceptor,
                httpErrorInterceptor,
            ])
        ),
    ],
};
