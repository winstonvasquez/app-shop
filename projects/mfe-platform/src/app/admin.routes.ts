import { Routes } from '@angular/router';

export const ADMIN_REMOTE_ROUTES: Routes = [
    {
        path: '',
        loadChildren: () =>
            import('@features/admin/admin.routes').then(m => m.adminRoutes),
    },
];
