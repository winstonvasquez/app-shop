import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { VacationService } from '../../services/vacation.service';

interface AccesoRapido {
    ruta: string;
    titulo: string;
    descripcion: string;
}

@Component({
    selector: 'app-rrhh-dashboard',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly vacationService = inject(VacationService);

    readonly totalEmployees = signal(0);
    readonly activeEmployees = signal(0);
    readonly attendanceToday = signal(0);
    readonly pendingVacations = signal(0);
    readonly upcomingEvaluations = signal(0);

    readonly periodoActual = new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' });

    readonly accesosRapidos: AccesoRapido[] = [
        {
            ruta: '/rrhh/employees',
            titulo: 'Empleados',
            descripcion: 'Gestionar nómina, contratos y datos personales'
        },
        {
            ruta: '/rrhh/attendance',
            titulo: 'Asistencia',
            descripcion: 'Control de marcaciones, tardanzas y horas extras'
        },
        {
            ruta: '/rrhh/vacations',
            titulo: 'Vacaciones y Licencias',
            descripcion: 'Solicitudes, aprobaciones y saldo de días'
        },
        {
            ruta: '/rrhh/payroll',
            titulo: 'Planilla Remunerativa',
            descripcion: 'AFP, ONP, renta 5ta, ESSALUD y boletas de pago'
        },
        {
            ruta: '/rrhh/evaluations',
            titulo: 'Evaluaciones de Desempeño',
            descripcion: 'Seguimiento por período y competencias'
        },
        {
            ruta: '/rrhh/trainings',
            titulo: 'Capacitaciones',
            descripcion: 'Plan anual de formación y desarrollo'
        },
    ];

    async ngOnInit(): Promise<void> {
        try {
            await Promise.all([
                this.employeeService.loadEmployees(),
                this.vacationService.loadVacations()
            ]);
            this.totalEmployees.set(this.employeeService.totalEmployees());
            this.activeEmployees.set(this.employeeService.activeEmployees().length);
            const vacations = this.vacationService.vacations();
            this.pendingVacations.set(vacations.filter(v => v.estado === 'SOLICITADO').length);
        } catch {
            // servicios no disponibles — valores en 0
        }
    }
}
