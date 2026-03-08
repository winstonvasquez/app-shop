import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';

@Component({
    selector: 'app-employee-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule
    ],
    templateUrl: './employee-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeListComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);

    readonly loading = this.employeeService.loading;
    readonly employees = this.employeeService.employees;

    readonly searchTerm = signal('');
    readonly displayedEmployees = signal<Employee[]>([]);

    readonly displayedColumns = ['codigo', 'nombre', 'documento', 'cargo', 'area', 'estado', 'actions'];
    readonly trackByEmployeeId = (index: number, employee: Employee) => employee.id;

    async ngOnInit(): Promise<void> {
        await this.employeeService.loadEmployees();
        this.displayedEmployees.set(this.employees());
    }

    onSearch(): void {
        const term = this.searchTerm().toLowerCase();
        if (!term) {
            this.displayedEmployees.set(this.employees());
            return;
        }

        const filtered = this.employees().filter(emp =>
            emp.codigoEmpleado.toLowerCase().includes(term) ||
            emp.nombres.toLowerCase().includes(term) ||
            emp.apellidos.toLowerCase().includes(term) ||
            emp.documentoIdentidad.includes(term)
        );
        this.displayedEmployees.set(filtered);
    }

    async deactivateEmployee(id: number): Promise<void> {
        if (confirm('¿Está seguro de desactivar este empleado?')) {
            try {
                await this.employeeService.deactivateEmployee(id);
                this.displayedEmployees.set(this.employees());
            } catch (error) {
                console.error('Error al desactivar empleado', error);
            }
        }
    }
}
