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
            },
            {
                path: 'solicitudes',
                loadComponent: () => import('./pages/solicitudes-compra/solicitudes-compra.component')
                    .then(m => m.SolicitudesCompraComponent)
            },
            {
                path: 'mis-solicitudes',
                loadComponent: () => import('./pages/mis-solicitudes/mis-solicitudes.component')
                    .then(m => m.MisSolicitudesComponent)
            },
            {
                path: 'bandeja-aprobaciones',
                loadComponent: () => import('./pages/bandeja-aprobaciones/bandeja-aprobaciones.component')
                    .then(m => m.BandejaAprobacionesComponent)
            },
            {
                path: 'config-aprobaciones',
                loadComponent: () => import('./pages/config-aprobaciones/config-aprobaciones.component')
                    .then(m => m.ConfigAprobacionesComponent)
            },
            {
                path: 'cotizaciones',
                loadComponent: () => import('./pages/cotizaciones/cotizaciones.component')
                    .then(m => m.CotizacionesComponent)
            },
            {
                path: 'facturas-proveedor',
                loadComponent: () => import('./pages/facturas-proveedor/facturas-proveedor.component')
                    .then(m => m.FacturasProveedorComponent)
            }
        ]
    }
];
