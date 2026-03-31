import { Routes } from '@angular/router';

/**
 * Rutas del mfe-finanzas en modo standalone (puerto 4204).
 * Agrupa Contabilidad + Tesorería como sub-rutas.
 */
export const routes: Routes = [
    { path: '', redirectTo: 'contabilidad', pathMatch: 'full' },
    {
        path: 'contabilidad',
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('@features/contabilidad/pages/dashboard/dashboard-contabilidad.component')
                        .then(m => m.DashboardContabilidadComponent),
            },
            {
                path: 'libro-diario',
                loadComponent: () =>
                    import('@features/contabilidad/pages/libro-diario/libro-diario.component')
                        .then(m => m.LibroDiarioComponent),
            },
            {
                path: 'libro-mayor',
                loadComponent: () =>
                    import('@features/contabilidad/pages/libro-mayor/libro-mayor.component')
                        .then(m => m.LibroMayorComponent),
            },
            {
                path: 'asientos',
                loadComponent: () =>
                    import('@features/contabilidad/pages/asientos/asientos.component')
                        .then(m => m.AsientosComponent),
            },
            {
                path: 'ventas',
                loadComponent: () =>
                    import('@features/contabilidad/pages/registro-ventas/registro-ventas.component')
                        .then(m => m.RegistroVentasComponent),
            },
            {
                path: 'compras',
                loadComponent: () =>
                    import('@features/contabilidad/pages/registro-compras/registro-compras.component')
                        .then(m => m.RegistroComprasComponent),
            },
            {
                path: 'igv',
                loadComponent: () =>
                    import('@features/contabilidad/pages/declaracion-igv/declaracion-igv.component')
                        .then(m => m.DeclaracionIgvComponent),
            },
        ],
    },
    {
        path: 'tesoreria',
        children: [
            { path: '', redirectTo: 'cajas', pathMatch: 'full' },
            {
                path: 'cajas',
                loadComponent: () =>
                    import('@features/tesoreria/pages/cajas/cajas.component')
                        .then(m => m.CajasComponent),
            },
            {
                path: 'pagos',
                loadComponent: () =>
                    import('@features/tesoreria/pages/pagos/pagos.component')
                        .then(m => m.PagosComponent),
            },
            {
                path: 'flujo-caja',
                loadComponent: () =>
                    import('@features/tesoreria/pages/flujo-caja/flujo-caja.component')
                        .then(m => m.FlujoCajaComponent),
            },
        ],
    },
    { path: '**', redirectTo: 'contabilidad' },
];
