import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                loadComponent: () => import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent)
            },
            {
                path: 'cart',
                loadComponent: () => import('./features/cart/pages/cart-page/cart-page.component').then(m => m.CartPageComponent)
            },
            {
                path: 'checkout',
                loadComponent: () => import('./features/checkout/pages/checkout-page/checkout-page.component').then(m => m.CheckoutPageComponent)
            },
            {
                path: 'products/:id',
                loadComponent: () => import('./features/products/pages/product-detail-page/product-detail-page.component').then(m => m.ProductDetailPageComponent)
            }
        ]
    },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
    },
    {
        path: 'admin',
        canActivate: [authGuard],
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
    },
    {
        path: 'pos',
        canActivate: [authGuard],
        loadChildren: () => import('./features/pos/pos.routes').then(m => m.POS_ROUTES)
    },
    {
        path: 'contabilidad',
        canActivate: [authGuard],
        loadChildren: () => import('./features/contabilidad/contabilidad.routes').then(m => m.CONTABILIDAD_ROUTES)
    },
    {
        path: 'inventario',
        canActivate: [authGuard],
        loadChildren: () => import('./features/inventario/inventario.routes').then(m => m.INVENTARIO_ROUTES)
    },
    {
        path: 'tesoreria',
        canActivate: [authGuard],
        loadChildren: () => import('./features/tesoreria/tesoreria.routes').then(m => m.TESORERIA_ROUTES)
    },
    { path: '**', redirectTo: '/' }
];

