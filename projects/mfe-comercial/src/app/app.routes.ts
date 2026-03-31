import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@features/../layout/main-layout/main-layout.component';

/** Rutas standalone de mfe-comercial (puerto 4202) */
export const routes: Routes = [
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
    { path: '**', redirectTo: '' },
];
