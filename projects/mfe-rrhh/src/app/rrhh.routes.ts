import { Routes } from '@angular/router';

/**
 * Rutas expuestas por mfe-rrhh al shell via Native Federation.
 * El shell las carga en /rrhh/** con authGuard + moduleGuard('RRHH').
 */
export const RRHH_REMOTE_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('@features/rrhh/pages/dashboard/dashboard.component')
                .then(m => m.DashboardComponent),
    },
    {
        path: 'employees',
        loadComponent: () =>
            import('@features/rrhh/pages/employee-list/employee-list.component')
                .then(m => m.EmployeeListComponent),
    },
    {
        path: 'employees/new',
        loadComponent: () =>
            import('@features/rrhh/pages/employee-form/employee-form.component')
                .then(m => m.EmployeeFormComponent),
    },
    {
        path: 'employees/:id',
        loadComponent: () =>
            import('@features/rrhh/pages/employee-form/employee-form.component')
                .then(m => m.EmployeeFormComponent),
    },
    {
        path: 'attendance',
        loadComponent: () =>
            import('@features/rrhh/pages/attendance/attendance.component')
                .then(m => m.AttendanceComponent),
    },
    {
        path: 'vacations',
        loadComponent: () =>
            import('@features/rrhh/pages/vacation-list/vacation-list.component')
                .then(m => m.VacationListComponent),
    },
    {
        path: 'payroll',
        loadComponent: () =>
            import('@features/rrhh/pages/payroll/payroll.component')
                .then(m => m.PayrollComponent),
    },
    {
        path: 'evaluations',
        loadComponent: () =>
            import('@features/rrhh/pages/evaluation-list/evaluation-list.component')
                .then(m => m.EvaluationListComponent),
    },
    {
        path: 'trainings',
        loadComponent: () =>
            import('@features/rrhh/pages/training-list/training-list.component')
                .then(m => m.TrainingListComponent),
    },
    {
        path: 'boleta',
        loadComponent: () =>
            import('@features/rrhh/pages/boleta-pago/boleta-pago.component')
                .then(m => m.BoletaPagoComponent),
        title: 'Boleta de Pago | ERP',
    },
];
