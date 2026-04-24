import { Routes } from '@angular/router';

/** Rutas standalone de mfe-operaciones (puerto 4203) */
export const routes: Routes = [
    { path: '', redirectTo: 'compras', pathMatch: 'full' },
    {
        path: 'compras',
        loadChildren: () => import('./compras.routes').then(m => m.COMPRAS_REMOTE_ROUTES),
    },
    {
        path: 'inventario',
        loadChildren: () => import('./inventario.routes').then(m => m.INVENTARIO_REMOTE_ROUTES),
    },
    {
        path: 'logistica',
        loadChildren: () => import('./logistica.routes').then(m => m.LOGISTICA_REMOTE_ROUTES),
    },
    { path: '**', redirectTo: 'compras' },
];
