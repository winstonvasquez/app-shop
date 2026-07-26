import { Routes } from '@angular/router';

export const logisticaRoutes: Routes = [
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
        loadComponent: () => import('./pages/dashboard-logistica/dashboard-logistica.component')
          .then(m => m.DashboardLogisticaComponent)
      },
      // --- Dominio WMS movido al módulo Inventario (dedup de IA 2026-06-16). ---
      // Se conservan como redirects para no romper enlaces/bookmarks antiguos.
      { path: 'almacenes',   redirectTo: '/admin/inventario/almacenes',   pathMatch: 'full' },
      { path: 'inventario',  redirectTo: '/admin/inventario/stock',       pathMatch: 'full' },
      { path: 'movimientos', redirectTo: '/admin/inventario/movimientos', pathMatch: 'full' },
      {
        path: 'guias',
        loadComponent: () => import('./pages/guias-remision/guias-page/guias-page.component')
          .then(m => m.GuiasPageComponent)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./pages/tracking/tracking-page/tracking-page.component')
          .then(m => m.TrackingPageComponent)
      },
      {
        path: 'rutas',
        loadComponent: () => import('./pages/delivery-routes/delivery-routes.component')
          .then(m => m.DeliveryRoutesComponent)
      },
      {
        path: 'transportistas',
        loadComponent: () => import('./pages/transportistas/transportistas-page.component')
          .then(m => m.TransportistasPageComponent)
      },
      {
        path: 'transportistas-sla',
        loadComponent: () => import('./pages/carrier-sla-management/carrier-sla-management.component')
          .then(m => m.CarrierSlaManagementComponent)
      },
      {
        path: 'envios',
        loadComponent: () => import('./pages/envios/envios-page.component')
          .then(m => m.EnviosPageComponent)
      },
      {
        path: 'devoluciones',
        loadComponent: () => import('./pages/devoluciones/devoluciones-page.component')
          .then(m => m.DevolucionesPageComponent)
      },
      {
        path: 'batch-picking',
        loadComponent: () => import('./pages/batch-picking/batch-picking.component')
          .then(m => m.BatchPickingComponent)
      },
      {
        path: 'kpi',
        loadComponent: () => import('./pages/kpi-dashboard/kpi-dashboard.component')
          .then(m => m.KpiDashboardComponent)
      },
      {
        path: 'picking-mobile',
        loadComponent: () => import('./pages/picking-mobile/picking-mobile.component')
          .then(m => m.PickingMobileComponent)
      },
      {
        path: 'stock-reservations',
        loadComponent: () => import('./pages/stock-reservations/stock-reservations.component')
          .then(m => m.StockReservationsComponent)
      },
      {
        path: 'notificaciones',
        loadComponent: () => import('./pages/notifications/notifications.component')
          .then(m => m.NotificationsComponent)
      },
      {
        path: 'mapeo-contable',
        loadComponent: () => import('./pages/accounting-mapping/accounting-mapping.component')
          .then(m => m.AccountingMappingComponent)
      }
    ]
  }
];
