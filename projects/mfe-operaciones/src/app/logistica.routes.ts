import { Routes } from '@angular/router';

export const LOGISTICA_REMOTE_ROUTES: Routes = [
    {
        path: '',
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('@features/logistica/pages/dashboard-logistica/dashboard-logistica.component')
                        .then(m => m.DashboardLogisticaComponent),
            },
            {
                path: 'almacenes',
                loadComponent: () =>
                    import('@features/logistica/pages/almacenes/almacenes-page/almacenes-page.component')
                        .then(m => m.AlmacenesPageComponent),
            },
            {
                path: 'inventario',
                loadComponent: () =>
                    import('@features/logistica/pages/inventario/inventario-page/inventario-page.component')
                        .then(m => m.InventarioPageComponent),
            },
            {
                path: 'movimientos',
                loadComponent: () =>
                    import('@features/logistica/pages/movimientos/movimientos-page/movimientos-page.component')
                        .then(m => m.MovimientosPageComponent),
            },
            {
                path: 'guias',
                loadComponent: () =>
                    import('@features/logistica/pages/guias-remision/guias-page/guias-page.component')
                        .then(m => m.GuiasPageComponent),
            },
            {
                path: 'tracking',
                loadComponent: () =>
                    import('@features/logistica/pages/tracking/tracking-page/tracking-page.component')
                        .then(m => m.TrackingPageComponent),
            },
            {
                path: 'transportistas',
                loadComponent: () =>
                    import('@features/logistica/pages/transportistas/transportistas-page.component')
                        .then(m => m.TransportistasPageComponent),
            },
            {
                path: 'envios',
                loadComponent: () =>
                    import('@features/logistica/pages/envios/envios-page.component')
                        .then(m => m.EnviosPageComponent),
            },
            {
                path: 'devoluciones',
                loadComponent: () =>
                    import('@features/logistica/pages/devoluciones/devoluciones-page.component')
                        .then(m => m.DevolucionesPageComponent),
            },
        ],
    },
];
