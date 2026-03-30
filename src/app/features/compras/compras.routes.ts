import { Routes } from '@angular/router';

export const comprasRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard-compras/dashboard-compras.component')
                    .then(m => m.DashboardComprasComponent)
            },
            {
                path: 'proveedores',
                loadComponent: () => import('./pages/proveedores/proveedores.component')
                    .then(m => m.ProveedoresComponent)
            },
            {
                path: 'ordenes',
                loadComponent: () => import('./pages/ordenes-compra/ordenes-compra.component')
                    .then(m => m.OrdenesCompraComponent)
            },
            {
                path: 'recepcion',
                loadComponent: () => import('./pages/recepcion/recepcion.component')
                    .then(m => m.RecepcionComponent)
            }
        ]
    }
];
