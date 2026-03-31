import { Routes } from '@angular/router';

/** Rutas standalone de mfe-platform (puerto 4206) */
export const routes: Routes = [
    { path: '', redirectTo: 'portal', pathMatch: 'full' },
    {
        path: 'portal',
        loadChildren: () => import('./portal.routes').then(m => m.PORTAL_REMOTE_ROUTES),
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin.routes').then(m => m.ADMIN_REMOTE_ROUTES),
    },
    { path: '**', redirectTo: 'portal' },
];
