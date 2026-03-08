import { Routes } from '@angular/router';
import { AdminLayoutComponent } from '@features/admin/layout/admin-layout/admin-layout.component';
import { DashboardComponent } from '@features/admin/pages/dashboard/dashboard.component';
import { authGuard } from '@core/auth/auth.guard';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'ventas',
                children: [
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    }
                ]
            },
            {
                path: 'compras',
                loadChildren: () => import('@features/compras/compras.routes').then(m => m.comprasRoutes)
            },
            {
                path: 'logistica',
                children: [
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    }
                ]
            },
            {
                path: 'contabilidad',
                children: [
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    }
                ]
            },
            {
                path: 'categories',
                loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent)
            },
            {
                path: 'products',
                loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
            },
            {
                path: 'inventario',
                loadChildren: () => import('@features/inventory/inventory.routes').then(m => m.inventoryRoutes)
            },
            {
                path: 'orders',
                loadComponent: () => import('./pages/orders/orders.component').then(m => m.OrdersComponent)
            },
            {
                path: 'transactions',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'returns',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'promotions',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'customers',
                loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent)
            },
            {
                path: 'segments',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'companies',
                loadComponent: () => import('./pages/companies/companies.component').then(m => m.CompaniesComponent)
            },
            {
                path: 'company-settings',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'general-config',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'system-params',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'reports',
                children: [
                    {
                        path: 'sales',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    },
                    {
                        path: 'inventory',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    },
                    {
                        path: 'customers',
                        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
                    }
                ]
            }
        ]
    }
];
