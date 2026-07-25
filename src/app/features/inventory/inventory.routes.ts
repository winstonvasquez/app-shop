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
    },
    {
        path: 'abc',
        loadComponent: () => import('./pages/abc-analysis/abc-analysis.component').then(m => m.AbcAnalysisComponent)
    },
    {
        path: 'asn',
        loadComponent: () => import('./pages/asn/asn.component').then(m => m.AsnComponent)
    },
    {
        path: 'zonas',
        loadComponent: () => import('./pages/zone-management/zone-management.component').then(m => m.ZoneManagementComponent)
    },
    {
        path: 'lotes',
        loadComponent: () => import('./pages/lot-management/lot-management.component').then(m => m.LotManagementComponent)
    },
    {
        path: 'series',
        loadComponent: () => import('./pages/serial-number-management/serial-number-management.component').then(m => m.SerialNumberManagementComponent)
    },
    {
        path: 'reglas-reposicion',
        loadComponent: () => import('./pages/replenishment-rules/replenishment-rules.component').then(m => m.ReplenishmentRulesComponent)
    },
    {
        path: 'kardex-almacen',
        loadComponent: () => import('./pages/kardex-warehouse/kardex-warehouse.component').then(m => m.KardexWarehouseComponent)
    }
];
