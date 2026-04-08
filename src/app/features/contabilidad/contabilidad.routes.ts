import { Routes } from '@angular/router';

export const CONTABILIDAD_ROUTES: Routes = [
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
                loadComponent: () => import('./pages/dashboard/dashboard-contabilidad.component')
                    .then(m => m.DashboardContabilidadComponent)
            },
            {
                path: 'libro-diario',
                loadComponent: () => import('./pages/libro-diario/libro-diario.component')
                    .then(m => m.LibroDiarioComponent)
            },
            {
                path: 'diario',
                loadComponent: () => import('./pages/libro-diario/libro-diario.component')
                    .then(m => m.LibroDiarioComponent)
            },
            {
                path: 'libro-mayor',
                loadComponent: () => import('./pages/libro-mayor/libro-mayor.component')
                    .then(m => m.LibroMayorComponent)
            },
            {
                path: 'asientos',
                loadComponent: () => import('./pages/asientos/asientos.component')
                    .then(m => m.AsientosComponent)
            },
            {
                path: 'ventas',
                loadComponent: () => import('./pages/registro-ventas/registro-ventas.component')
                    .then(m => m.RegistroVentasComponent)
            },
            {
                path: 'compras',
                loadComponent: () => import('./pages/registro-compras/registro-compras.component')
                    .then(m => m.RegistroComprasComponent)
            },
            {
                path: 'igv',
                loadComponent: () => import('./pages/declaracion-igv/declaracion-igv.component')
                    .then(m => m.DeclaracionIgvComponent)
            },
            {
                path: 'balance',
                loadComponent: () => import('./pages/balance-general/balance-general.component')
                    .then(m => m.BalanceGeneralComponent)
            },
            {
                path: 'estado-resultados',
                loadComponent: () => import('./pages/estado-resultados/estado-resultados.component')
                    .then(m => m.EstadoResultadosComponent)
            },
            {
                path: 'plan-cuentas',
                loadComponent: () => import('./pages/plan-cuentas/plan-cuentas.component')
                    .then(m => m.PlanCuentasComponent)
            },
            {
                path: 'asientos-recurrentes',
                loadComponent: () => import('./pages/asientos-recurrentes/asientos-recurrentes.component')
                    .then(m => m.AsientosRecurrentesComponent)
            },
            {
                path: 'cierre',
                loadComponent: () => import('./pages/cierre-contable/cierre-contable.component')
                    .then(m => m.CierreContableComponent)
            },
            {
                path: 'reglas-asiento',
                loadComponent: () => import('./pages/reglas-asiento/reglas-asiento.component')
                    .then(m => m.ReglasAsientoComponent)
            },
            {
                path: 'flujo-efectivo',
                loadComponent: () => import('./pages/flujo-efectivo/flujo-efectivo.component')
                    .then(m => m.FlujoEfectivoComponent)
            },
            {
                path: 'conciliacion',
                loadComponent: () => import('./pages/conciliacion-bancaria/conciliacion-bancaria.component')
                    .then(m => m.ConciliacionBancariaComponent)
            }
        ]
    }
];
