import { Routes } from '@angular/router';

export const RRHH_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
    },
    {
        path: 'employees',
        loadComponent: () => import('./pages/employee-list/employee-list.component').then(m => m.EmployeeListComponent)
    },
    {
        path: 'employees/new',
        loadComponent: () => import('./pages/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
    },
    {
        path: 'employees/:id',
        loadComponent: () => import('./pages/employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
    },
    {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent)
    },
    {
        path: 'vacations',
        loadComponent: () => import('./pages/vacation-list/vacation-list.component').then(m => m.VacationListComponent)
    },
    {
        path: 'payroll',
        loadComponent: () => import('./pages/payroll/payroll.component').then(m => m.PayrollComponent)
    },
    {
        path: 'evaluations',
        loadComponent: () => import('./pages/evaluation-list/evaluation-list.component').then(m => m.EvaluationListComponent)
    },
    {
        path: 'trainings',
        loadComponent: () => import('./pages/training-list/training-list.component').then(m => m.TrainingListComponent)
    }
];
