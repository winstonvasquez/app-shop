import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/inventory-dashboard/inventory-dashboard.component').then(m => m.InventoryDashboardComponent)
    },
    {
        path: 'almacenes',
        loadComponent: () => import('./pages/warehouse-management/warehouse-management.component').then(m => m.WarehouseManagementComponent)
    },
    {
        path: 'ubicaciones',
        loadComponent: () => import('./pages/location-management/location-management.component').then(m => m.LocationManagementComponent)
    },
    {
        path: 'stock',
        loadComponent: () => import('./pages/stock-view/stock-view.component').then(m => m.StockViewComponent)
    },
    {
        path: 'movimientos',
        loadComponent: () => import('./pages/movement-management/movement-management.component').then(m => m.MovementManagementComponent)
    },
    {
        path: 'transferencias',
        loadComponent: () => import('./pages/transfer-management/transfer-management.component').then(m => m.TransferManagementComponent)
    },
    {
        path: 'conteos',
        loadComponent: () => import('./pages/inventory-count/inventory-count.component').then(m => m.InventoryCountComponent)
    },
    {
        path: 'kardex',
        loadComponent: () => import('./pages/kardex-view/kardex-view.component').then(m => m.KardexViewComponent)
    }
];
