import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { authGuard } from './core/auth/auth.guard';
import { customerGuard } from './core/auth/customer.guard';
import { moduleGuard } from './core/auth/module.guard';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        loadChildren: () => Promise.resolve([
            { path: '', redirectTo: 'home', pathMatch: 'full' as const },
            {
                path: 'home',
                loadComponent: () =>
                    import('./features/home/pages/home-page/home-page.component')
                        .then(m => m.HomePageComponent),
            },
            {
                path: 'cart',
                loadComponent: () =>
                    import('./features/cart/pages/cart-page/cart-page.component')
                        .then(m => m.CartPageComponent),
            },
            {
                path: 'checkout',
                loadComponent: () =>
                    import('./features/checkout/pages/checkout-page/checkout-page.component')
                        .then(m => m.CheckoutPageComponent),
            },
            {
                path: 'products',
                loadComponent: () =>
                    import('./features/products/pages/products-page/products-page.component')
                        .then(m => m.ProductsPageComponent),
            },
            {
                path: 'products/compare',
                loadComponent: () =>
                    import('./features/products/pages/compare-page/compare-page.component')
                        .then(m => m.ComparePageComponent),
            },
            {
                path: 'products/:id',
                loadComponent: () =>
                    import('./features/products/pages/product-detail-page/product-detail-page.component')
                        .then(m => m.ProductDetailPageComponent),
            },
            {
                path: 'info/:slug',
                loadComponent: () =>
                    import('./features/info/info-page/info-page.component')
                        .then(m => m.InfoPageComponent),
            },
            // Rutas de "Mi Cuenta" — requieren cliente autenticado
            {
                path: 'account',
                canActivate: [customerGuard],
                loadChildren: () => import('./features/account/account.routes').then(m => m.ACCOUNT_ROUTES),
            },
            // Confirmación de pedido post-checkout — accesible para invitados
            {
                path: 'orders/confirmation/:orderId',
                loadComponent: () =>
                    import('./features/orders/pages/order-confirmation/order-confirmation.component')
                        .then(m => m.OrderConfirmationComponent),
            },
        ])
    },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    // Design System v2 (Confianza) — preview standalone con chrome propio
    {
        path: 'design-system',
        loadComponent: () =>
            import('./features/design-system/design-system-page.component')
                .then(m => m.DesignSystemPageComponent),
    },
    {
        path: 'admin',
        canActivate: [authGuard],
        loadChildren: () =>
            loadRemoteModule('mfe-platform', './AdminRoutes')
                .then((m) => m.ADMIN_REMOTE_ROUTES)
                .catch(() =>
                    import('./features/admin/admin.routes').then((m) => m.adminRoutes)
                ),
    },
    {
        path: 'pos',
        canActivate: [authGuard, moduleGuard('POS')],
        loadChildren: () =>
            loadRemoteModule('mfe-pos', './Routes')
                .then((m) => m.POS_REMOTE_ROUTES)
                .catch(() =>
                    import('./features/pos/pos.routes').then((m) => m.POS_ROUTES)
                ),
    },
    // Rutas legacy → redirigen al módulo correspondiente en /admin (con sidebar)
    { path: 'contabilidad', redirectTo: '/admin/contabilidad', pathMatch: 'prefix' },
    { path: 'inventario',   redirectTo: '/admin/inventario',   pathMatch: 'prefix' },
    { path: 'tesoreria',    redirectTo: '/admin/tesoreria',    pathMatch: 'prefix' },
    { path: 'logistica',    redirectTo: '/admin/logistica',    pathMatch: 'prefix' },
    { path: 'rrhh',         redirectTo: '/admin/rrhh',         pathMatch: 'prefix' },
    { path: 'compras',      redirectTo: '/admin/compras',      pathMatch: 'prefix' },
    {
        path: 'portal',
        loadChildren: () =>
            loadRemoteModule('mfe-platform', './PortalRoutes')
                .then((m) => m.PORTAL_REMOTE_ROUTES)
                .catch(() =>
                    import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES)
                ),
    },
    { path: '**', redirectTo: '/' }
];
