import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VacationService } from '../../services/vacation.service';
import { EmployeeService } from '../../services/employee.service';

@Component({
    selector: 'app-vacation-list',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './vacation-list.component.html'
})
export class VacationListComponent implements OnInit {
    private readonly vacationService = inject(VacationService);
    private readonly employeeService = inject(EmployeeService);

    readonly loading = this.vacationService.loading;
    readonly vacations = this.vacationService.vacations;
    readonly employees = this.employeeService.employees;

    readonly displayedColumns = ['empleado', 'fechaInicio', 'fechaFin', 'dias', 'estado', 'actions'];

    async ngOnInit(): Promise<void> {
        await Promise.all([
            this.vacationService.loadVacations(),
            this.employeeService.loadEmployees()
        ]);
    }

    getEmployeeName(employeeId: number): string {
        const employee = this.employees().find(e => e.id === employeeId);
        return employee ? `${employee.nombres} ${employee.apellidos}` : 'Desconocido';
    }

    async approveVacation(id: number): Promise<void> {
        if (confirm('¿Aprobar esta solicitud de vacaciones?')) {
            try {
                await this.vacationService.approveOrReject(id, {
                    approved: true,
                    comentarios: 'Aprobado'
                });
            } catch (error) {
                console.error('Error al aprobar vacaciones', error);
            }
        }
    }

    async rejectVacation(id: number): Promise<void> {
        const comentarios = prompt('Motivo del rechazo:');
        if (comentarios) {
            try {
                await this.vacationService.approveOrReject(id, {
                    approved: false,
                    comentarios
                });
            } catch (error) {
                console.error('Error al rechazar vacaciones', error);
            }
        }
    }
}
