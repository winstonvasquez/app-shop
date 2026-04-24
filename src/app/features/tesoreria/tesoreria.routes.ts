import { Routes } from '@angular/router';

export const TESORERIA_ROUTES: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard-tesoreria/dashboard-tesoreria.component').then(m => m.DashboardTesoreriaComponent),
        title: 'Dashboard Tesorería | ERP'
    },
    {
        path: 'cajas',
        loadComponent: () => import('./pages/cajas/cajas.component').then(m => m.CajasComponent),
        title: 'Cajas | ERP'
    },
    {
        path: 'flujo-caja',
        loadComponent: () => import('./pages/flujo-caja/flujo-caja.component').then(m => m.FlujoCajaComponent),
        title: 'Flujo de Caja | ERP'
    },
    {
        path: 'pagos',
        loadComponent: () => import('./pages/pagos/pagos.component').then(m => m.PagosComponent),
        title: 'Gestión de Pagos | ERP'
    },
    {
        path: 'cuentas-bancarias',
        loadComponent: () => import('./pages/cuentas-bancarias/cuentas-bancarias.component').then(m => m.CuentasBancariasComponent),
        title: 'Cuentas Bancarias | ERP'
    },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];
