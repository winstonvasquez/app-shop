import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/pos-page/pos-page.component').then(m => m.PosPageComponent),
        title: 'Punto de Venta | ERP'
    },
    {
        path: 'devoluciones',
        loadComponent: () => import('./pages/pos-devoluciones/pos-devoluciones.component').then(m => m.PosDevolucionesComponent),
        title: 'Devoluciones POS | ERP'
    }
];
