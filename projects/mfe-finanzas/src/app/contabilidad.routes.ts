import { Routes } from '@angular/router';

/**
 * Rutas de Contabilidad expuestas por mfe-finanzas al shell.
 * El shell las carga en /contabilidad/** con authGuard + moduleGuard('CONTABILIDAD').
 */
export const CONTABILIDAD_REMOTE_ROUTES: Routes = [
    {
        path: '',
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
                path: 'diario',
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
];
