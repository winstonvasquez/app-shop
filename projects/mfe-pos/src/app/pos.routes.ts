import { Routes } from '@angular/router';

/**
 * Rutas expuestas por mfe-pos al shell via Native Federation.
 * El shell las carga en /pos/** con authGuard + moduleGuard('POS').
 */
export const POS_REMOTE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('@features/pos/pages/pos-page/pos-page.component')
                .then(m => m.PosPageComponent),
    },
];
