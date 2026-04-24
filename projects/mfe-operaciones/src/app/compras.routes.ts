import { Routes } from '@angular/router';

export const COMPRAS_REMOTE_ROUTES: Routes = [
    {
        path: '',
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('@features/compras/pages/dashboard-compras/dashboard-compras.component')
                        .then(m => m.DashboardComprasComponent),
            },
            {
                path: 'proveedores',
                loadComponent: () =>
                    import('@features/compras/pages/proveedores/proveedores.component')
                        .then(m => m.ProveedoresComponent),
            },
            {
                path: 'proveedores/nuevo',
                loadComponent: () =>
                    import('@features/compras/pages/proveedor-form/proveedor-form.component')
                        .then(m => m.ProveedorFormComponent),
            },
            {
                path: 'proveedores/:id',
                loadComponent: () =>
                    import('@features/compras/pages/proveedor-form/proveedor-form.component')
                        .then(m => m.ProveedorFormComponent),
            },
            {
                path: 'ordenes',
                loadComponent: () =>
                    import('@features/compras/pages/ordenes-compra/ordenes-compra.component')
                        .then(m => m.OrdenesCompraComponent),
            },
            {
                path: 'ordenes/nueva',
                loadComponent: () =>
                    import('@features/compras/pages/orden-compra-form/orden-compra-form.component')
                        .then(m => m.OrdenCompraFormComponent),
            },
            {
                path: 'ordenes/:id',
                loadComponent: () =>
                    import('@features/compras/pages/orden-compra-form/orden-compra-form.component')
                        .then(m => m.OrdenCompraFormComponent),
            },
            {
                path: 'recepcion',
                loadComponent: () =>
                    import('@features/compras/pages/recepcion/recepcion.component')
                        .then(m => m.RecepcionComponent),
            },
            {
                path: 'recepcion/:id',
                loadComponent: () =>
                    import('@features/compras/pages/recepcion-detalle/recepcion-detalle.component')
                        .then(m => m.RecepcionDetalleComponent),
            },
        ],
    },
];
