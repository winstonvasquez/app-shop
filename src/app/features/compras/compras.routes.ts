import { Routes } from '@angular/router';

export const comprasRoutes: Routes = [
    {
        path: 'compras',
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
                path: 'proveedores/nuevo',
                loadComponent: () => import('./pages/proveedor-form/proveedor-form.component')
                    .then(m => m.ProveedorFormComponent)
            },
            {
                path: 'proveedores/:id',
                loadComponent: () => import('./pages/proveedor-form/proveedor-form.component')
                    .then(m => m.ProveedorFormComponent)
            },
            {
                path: 'ordenes',
                loadComponent: () => import('./pages/ordenes-compra/ordenes-compra.component')
                    .then(m => m.OrdenesCompraComponent)
            },
            {
                path: 'ordenes/nueva',
                loadComponent: () => import('./pages/orden-compra-form/orden-compra-form.component')
                    .then(m => m.OrdenCompraFormComponent)
            },
            {
                path: 'ordenes/:id',
                loadComponent: () => import('./pages/orden-compra-form/orden-compra-form.component')
                    .then(m => m.OrdenCompraFormComponent)
            },
            {
                path: 'recepcion',
                loadComponent: () => import('./pages/recepcion/recepcion.component')
                    .then(m => m.RecepcionComponent)
            },
            {
                path: 'recepcion/:id',
                loadComponent: () => import('./pages/recepcion-detalle/recepcion-detalle.component')
                    .then(m => m.RecepcionDetalleComponent)
            }
        ]
    }
];
