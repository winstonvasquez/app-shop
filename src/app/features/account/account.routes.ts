import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'orders',
        pathMatch: 'full'
    },
    {
        path: 'orders',
        loadComponent: () =>
            import('./pages/orders/account-orders.component').then(m => m.AccountOrdersComponent),
    },
    {
        path: 'orders/:id',
        loadComponent: () =>
            import('../orders/pages/order-detail/order-detail.component').then(m => m.OrderDetailComponent),
    },
    {
        path: 'profile',
        loadComponent: () =>
            import('./pages/profile/account-profile.component').then(m => m.AccountProfileComponent),
    },
    {
        path: 'addresses',
        loadComponent: () =>
            import('./pages/addresses/account-addresses.component').then(m => m.AccountAddressesComponent),
    },
    {
        path: 'security',
        loadComponent: () =>
            import('./pages/security/account-security.component').then(m => m.AccountSecurityComponent),
    },
    {
        path: 'history',
        loadComponent: () =>
            import('./pages/history/account-history.component').then(m => m.AccountHistoryComponent),
    },
    {
        path: 'notifications',
        loadComponent: () =>
            import('./pages/notifications/account-notifications.component').then(m => m.AccountNotificationsComponent),
    },
    {
        path: 'reviews',
        loadComponent: () =>
            import('./pages/reviews/account-reviews.component').then(m => m.AccountReviewsComponent),
    },
    {
        path: 'permissions',
        loadComponent: () =>
            import('./pages/permissions/account-permissions.component').then(m => m.AccountPermissionsComponent),
    },
    {
        path: 'followed-stores',
        loadComponent: () =>
            import('./pages/followed-stores/account-followed-stores.component').then(m => m.AccountFollowedStoresComponent),
    },
    {
        path: 'coupons',
        loadComponent: () =>
            import('./pages/coupons/account-coupons.component').then(m => m.AccountCouponsComponent),
    },
    {
        path: 'credit',
        loadComponent: () =>
            import('./pages/credit/account-credit.component').then(m => m.AccountCreditComponent),
    },
    {
        path: 'wishlist',
        loadComponent: () =>
            import('./pages/wishlist/account-wishlist.component').then(m => m.AccountWishlistComponent),
    },
];
