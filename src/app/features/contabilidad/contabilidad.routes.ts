import { Routes } from '@angular/router';

export const CONTABILIDAD_ROUTES: Routes = [
    {
        path: '',
        children: [
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
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
