import { Routes } from '@angular/router';

/**
 * Rutas del mfe-rrhh en modo standalone (puerto 4205).
 * En el shell se usan RRHH_REMOTE_ROUTES de rrhh.routes.ts.
 */
export const routes: Routes = [
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
    { path: '**', redirectTo: 'dashboard' },
];
