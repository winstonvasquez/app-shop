import { Routes } from '@angular/router';

// TODO: Implementar componentes Finance
// Los componentes de Finance están pendientes de implementación
// Por ahora, las rutas están deshabilitadas para evitar errores de compilación

export const FINANCE_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    }
    // TODO: Descomentar cuando se implementen los componentes:
    // - finance-dashboard.component
    // - account-list.component
    // - journal-entry-form.component
    // - journal-entry-detail.component
    // - invoice-receivable-list.component
    // - invoice-receivable-detail.component
    // - payment-collection-list.component
    // - payment-collection-form.component
    // - general-ledger-report.component
    // - trial-balance-report.component
    // - balance-sheet-report.component
    // - income-statement-report.component
];
