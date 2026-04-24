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
                        loadComponent: () => import('./pages/ventas-dashboard/ventas-dashboard.component').then(m => m.VentasDashboardComponent)
                    }
                ]
            },
            {
                path: 'compras',
                loadChildren: () => import('@features/compras/compras.routes').then(m => m.comprasRoutes)
            },
            {
                path: 'logistica',
                loadChildren: () => import('@features/logistica/logistica.routes').then(m => m.logisticaRoutes)
            },
            {
                path: 'contabilidad',
                loadChildren: () => import('@features/contabilidad/contabilidad.routes').then(m => m.CONTABILIDAD_ROUTES)
            },
            {
                path: 'rrhh',
                loadChildren: () => import('@features/rrhh/rrhh.routes').then(m => m.RRHH_ROUTES)
            },
            {
                path: 'tesoreria',
                loadChildren: () => import('@features/tesoreria/tesoreria.routes').then(m => m.TESORERIA_ROUTES)
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
                loadComponent: () => import('./pages/transacciones/transacciones.component').then(m => m.TransaccionesComponent)
            },
            {
                path: 'returns',
                loadComponent: () => import('./pages/returns/returns.component').then(m => m.ReturnsComponent)
            },
            {
                path: 'promotions',
                loadComponent: () => import('./pages/promotions/promotions.component').then(m => m.PromotionsComponent)
            },
            {
                path: 'customers',
                loadComponent: () => import('./pages/customers/customer-list/customer-list.component').then(m => m.CustomerListComponent)
            },
            {
                path: 'customers/dashboard',
                loadComponent: () => import('./pages/customers/customer-dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent)
            },
            {
                path: 'customers/:id',
                loadComponent: () => import('./pages/customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent)
            },
            {
                path: 'segments',
                loadComponent: () => import('./pages/segments/segments.component').then(m => m.SegmentsComponent)
            },
            {
                path: 'companies',
                loadComponent: () => import('./pages/companies/companies.component').then(m => m.CompaniesComponent)
            },
            {
                path: 'companies/:id',
                loadComponent: () => import('./pages/company-detail/company-detail.component').then(m => m.CompanyDetailComponent)
            },
            {
                path: 'general-config',
                loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
            },
            {
                path: 'system-params',
                loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent)
            },
            {
                path: 'store-theme',
                loadComponent: () => import('./pages/store-theme/store-theme.component').then(m => m.StoreThemeComponent)
            },
            {
                path: 'apariencia',
                loadComponent: () => import('./pages/apariencia/apariencia.component').then(m => m.AparienciaComponent)
            },
            {
                path: 'footer-manager',
                loadComponent: () => import('./pages/footer-manager/footer-manager.component').then(m => m.FooterManagerComponent)
            },
            {
                path: 'slider-manager',
                loadComponent: () => import('./pages/slider-manager/slider-manager.component').then(m => m.SliderManagerComponent)
            },
            {
                path: 'soporte/chat',
                loadComponent: () => import('./pages/chat-soporte/chat-soporte.component').then(m => m.ChatSoporteComponent)
            },
            {
                path: 'pagos',
                loadComponent: () => import('./pages/pagos/admin-pagos.component').then(m => m.AdminPagosComponent)
            },
            {
                path: 'reports',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./pages/reportes/reportes-ejecutivo.component').then(m => m.ReportesEjecutivoComponent)
                    },
                    {
                        path: 'ejecutivo',
                        loadComponent: () => import('./pages/reportes/reportes-ejecutivo.component').then(m => m.ReportesEjecutivoComponent)
                    },
                    {
                        path: 'sales',
                        loadComponent: () => import('./pages/reportes/reportes-ejecutivo.component').then(m => m.ReportesEjecutivoComponent)
                    },
                    {
                        path: 'inventory',
                        loadComponent: () => import('./pages/reportes/reportes-inventario.component').then(m => m.ReportesInventarioComponent)
                    },
                    {
                        path: 'customers',
                        loadComponent: () => import('./pages/reportes/reportes-clientes.component').then(m => m.ReportesClientesComponent)
                    },
                    {
                        path: 'ventas',
                        loadComponent: () => import('./pages/reportes/reportes-ventas.component').then(m => m.ReportesVentasComponent)
                    },
                    {
                        path: 'rrhh',
                        loadComponent: () => import('./pages/reportes/reportes-rrhh.component').then(m => m.ReportesRrhhComponent)
                    }
                ]
            }
        ]
    }
];
