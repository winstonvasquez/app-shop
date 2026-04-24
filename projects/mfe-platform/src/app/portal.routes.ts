import { Routes } from '@angular/router';

export const PORTAL_REMOTE_ROUTES: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('@features/portal/portal.routes').then(m => m.PORTAL_ROUTES),
    },
];
