import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/pos-page/pos-page.component').then(m => m.PosPageComponent),
        title: 'Punto de Venta | ERP'
    },
    {
        // Devoluciones NO es una pantalla independiente: es una screen más dentro del
        // shell del POS (igual que 'historial'/'turno'), alcanzable también por el
        // sidenav vertical. Esta ruta existe solo para que enlaces externos (p. ej.
        // admin-sidebar → '/pos/devoluciones') abran el POS completo con esa screen
        // activa, en vez de renderizar el componente desnudo sin topbar/sidenav.
        path: 'devoluciones',
        loadComponent: () => import('./pages/pos-page/pos-page.component').then(m => m.PosPageComponent),
        data: { initialScreen: 'devoluciones' },
        title: 'Devoluciones POS | ERP'
    }
];
