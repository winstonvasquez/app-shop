import { Routes } from '@angular/router';

/**
 * Rutas de Tesorería expuestas por mfe-finanzas al shell.
 * El shell las carga en /tesoreria/** con authGuard + moduleGuard('TESORERIA').
 */
export const TESORERIA_REMOTE_ROUTES: Routes = [
    {
        path: 'dashboard',
        loadComponent: () =>
            import('@features/tesoreria/pages/dashboard-tesoreria/dashboard-tesoreria.component')
                .then(m => m.DashboardTesoreriaComponent),
        title: 'Dashboard Tesorería | ERP',
    },
    {
        path: 'cuentas-bancarias',
        loadComponent: () =>
            import('@features/tesoreria/pages/cuentas-bancarias/cuentas-bancarias.component')
                .then(m => m.CuentasBancariasComponent),
        title: 'Cuentas Bancarias | ERP',
    },
    {
        path: 'cajas',
        loadComponent: () =>
            import('@features/tesoreria/pages/cajas/cajas.component')
                .then(m => m.CajasComponent),
        title: 'Cajas | ERP',
    },
    {
        path: 'pagos',
        loadComponent: () =>
            import('@features/tesoreria/pages/pagos/pagos.component')
                .then(m => m.PagosComponent),
        title: 'Gestión de Pagos | ERP',
    },
    {
        path: 'flujo-caja',
        loadComponent: () =>
            import('@features/tesoreria/pages/flujo-caja/flujo-caja.component')
                .then(m => m.FlujoCajaComponent),
        title: 'Flujo de Caja | ERP',
    },
    { path: '', redirectTo: 'cajas', pathMatch: 'full' },
];
