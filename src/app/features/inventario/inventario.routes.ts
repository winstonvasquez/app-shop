import { Routes } from '@angular/router';
import { MovimientosInventarioComponent } from './pages/movimientos/movimientos-inventario.component';
import { StockInventarioComponent } from './pages/stock/stock-inventario.component';
import { KardexComponent } from './pages/kardex/kardex.component';

export const INVENTARIO_ROUTES: Routes = [
    { path: 'movimientos', component: MovimientosInventarioComponent, title: 'Movimientos de Inventario | ERP' },
    { path: 'stock', component: StockInventarioComponent, title: 'Stock | ERP' },
    { path: 'kardex', component: KardexComponent, title: 'Kardex | ERP' },
    { path: '', redirectTo: 'stock', pathMatch: 'full' }
];
