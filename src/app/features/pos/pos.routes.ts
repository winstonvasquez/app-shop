import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/pos-page/pos-page.component').then(m => m.PosPageComponent)
    }
];
