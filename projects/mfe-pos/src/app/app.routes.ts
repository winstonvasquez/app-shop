import { Routes } from '@angular/router';

/**
 * Rutas del mfe-pos en modo standalone (desarrollo independiente en puerto 4201).
 * Cuando se carga desde el shell, se usan POS_REMOTE_ROUTES de pos.routes.ts.
 */
export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@features/pos/pages/pos-page/pos-page.component')
                .then(m => m.PosPageComponent),
    },
    { path: '**', redirectTo: '' },
];
