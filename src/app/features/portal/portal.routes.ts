import { Routes } from '@angular/router';
import { PortalLayoutComponent } from './layout/portal-layout.component';

export const PORTAL_ROUTES: Routes = [
    {
        path: '',
        component: PortalLayoutComponent,
        children: [
            { path: '', redirectTo: 'landing', pathMatch: 'full' },
            {
                path: 'landing',
                loadComponent: () => import('./pages/landing/landing-page.component').then(m => m.LandingPageComponent)
            },
            {
                path: 'pricing',
                loadComponent: () => import('./pages/pricing/pricing-page.component').then(m => m.PricingPageComponent)
            },
            {
                path: 'register',
                loadComponent: () => import('./pages/register/register-page.component').then(m => m.RegisterPageComponent)
            },
            {
                path: 'upgrade',
                loadComponent: () => import('./pages/upgrade/upgrade-page.component').then(m => m.UpgradePageComponent)
            },
        ]
    }
];
