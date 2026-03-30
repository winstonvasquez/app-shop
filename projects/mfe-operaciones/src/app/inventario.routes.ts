import { Routes } from '@angular/router';

export const INVENTARIO_REMOTE_ROUTES: Routes = [
    { path: '', redirectTo: 'stock', pathMatch: 'full' },
    {
        path: 'stock',
        loadComponent: () =>
            import('@features/inventario/pages/stock/stock-inventario.component')
                .then(m => m.StockInventarioComponent),
        title: 'Stock | ERP',
    },
    {
        path: 'movimientos',
        loadComponent: () =>
            import('@features/inventario/pages/movimientos/movimientos-inventario.component')
                .then(m => m.MovimientosInventarioComponent),
        title: 'Movimientos | ERP',
    },
    {
        path: 'kardex',
        loadComponent: () =>
            import('@features/inventario/pages/kardex/kardex.component')
                .then(m => m.KardexComponent),
        title: 'Kardex | ERP',
    },
];
