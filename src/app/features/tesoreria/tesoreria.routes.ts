import { Routes } from '@angular/router';
import { PagosComponent } from './pages/pagos/pagos.component';
import { CajasComponent } from './pages/cajas/cajas.component';
import { FlujoCajaComponent } from './pages/flujo-caja/flujo-caja.component';

export const TESORERIA_ROUTES: Routes = [
    { path: 'pagos', component: PagosComponent, title: 'Gestión de Pagos | ERP' },
    { path: 'cajas', component: CajasComponent, title: 'Cajas | ERP' },
    { path: 'flujo-caja', component: FlujoCajaComponent, title: 'Flujo de Caja | ERP' },
    { path: '', redirectTo: 'cajas', pathMatch: 'full' }
];
