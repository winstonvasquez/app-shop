import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@features/../layout/main-layout/main-layout.component';

/**
 * Rutas del dominio Comercial expuestas por mfe-comercial al shell.
 * CartService es providedIn:'root' — se comparte automáticamente via shareAll().
 * El acoplamiento cart ↔ checkout se resuelve por el singleton de Angular Core.
 */
export const STOREFRONT_REMOTE_ROUTES: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                loadComponent: () =>
                    import('@features/home/pages/home-page/home-page.component')
                        .then(m => m.HomePageComponent),
            },
            {
                path: 'products/:id',
                loadComponent: () =>
                    import('@features/products/pages/product-detail-page/product-detail-page.component')
                        .then(m => m.ProductDetailPageComponent),
            },
            {
                path: 'cart',
                loadComponent: () =>
                    import('@features/cart/pages/cart-page/cart-page.component')
                        .then(m => m.CartPageComponent),
            },
            {
                path: 'checkout',
                loadComponent: () =>
                    import('@features/checkout/pages/checkout-page/checkout-page.component')
                        .then(m => m.CheckoutPageComponent),
            },
        ],
    },
];
