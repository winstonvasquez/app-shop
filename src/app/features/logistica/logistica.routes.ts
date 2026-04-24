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
      {
        path: 'almacenes',
        loadComponent: () => import('./pages/almacenes/almacenes-page/almacenes-page.component')
          .then(m => m.AlmacenesPageComponent)
      },
      {
        path: 'inventario',
        loadComponent: () => import('./pages/inventario/inventario-page/inventario-page.component')
          .then(m => m.InventarioPageComponent)
      },
      {
        path: 'movimientos',
        loadComponent: () => import('./pages/movimientos/movimientos-page/movimientos-page.component')
          .then(m => m.MovimientosPageComponent)
      },
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
        path: 'transportistas',
        loadComponent: () => import('./pages/transportistas/transportistas-page.component')
          .then(m => m.TransportistasPageComponent)
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
      }
    ]
  }
];
