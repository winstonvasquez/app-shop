import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../services/employee.service';

@Component({
    selector: 'app-attendance',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    template: `
        <div class="attendance-container">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Registro de Asistencia</h2>
                </div>

                <div class="card-content">
                    @if (message()) {
                        <div class="alert alert-info">
                            {{ message() }}
                        </div>
                    }

                    <form [formGroup]="attendanceForm" (ngSubmit)="onSubmit()">
                        <div class="form-group">
                            <label for="employeeId">Empleado *</label>
                            <select id="employeeId" class="form-control" formControlName="employeeId">
                                <option value="">Seleccione un empleado</option>
                                @for (employee of employees(); track employee.id) {
                                    <option [value]="employee.id">
                                        {{ employee.codigoEmpleado }} - {{ employee.nombres }} {{ employee.apellidos }}
                                    </option>
                                }
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="fecha">Fecha *</label>
                            <input 
                                id="fecha"
                                type="date" 
                                class="form-control" 
                                formControlName="fecha">
                        </div>

                        <div class="time-row">
                            <div class="form-group">
                                <label for="horaEntrada">Hora Entrada</label>
                                <input 
                                    id="horaEntrada"
                                    type="time" 
                                    class="form-control" 
                                    formControlName="horaEntrada">
                            </div>

                            <div class="form-group">
                                <label for="horaSalida">Hora Salida</label>
                                <input 
                                    id="horaSalida"
                                    type="time" 
                                    class="form-control" 
                                    formControlName="horaSalida">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="tipoRegistro">Tipo de Registro *</label>
                            <select id="tipoRegistro" class="form-control" formControlName="tipoRegistro">
                                <option value="NORMAL">Normal</option>
                                <option value="TARDANZA">Tardanza</option>
                                <option value="FALTA">Falta</option>
                                <option value="PERMISO">Permiso</option>
                                <option value="LICENCIA">Licencia</option>
                                <option value="VACACIONES">Vacaciones</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="observaciones">Observaciones</label>
                            <textarea 
                                id="observaciones"
                                class="form-control" 
                                formControlName="observaciones" 
                                rows="3"></textarea>
                        </div>

                        <div class="form-actions">
                            <button 
                                class="btn btn-primary" 
                                type="submit" 
                                [disabled]="attendanceForm.invalid || loading()">
                                @if (loading()) {
                                    Registrando...
                                } @else {
                                    Registrar Asistencia
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .attendance-container {
            padding: 24px;
            max-width: 600px;
            margin: 0 auto;
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .time-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        mat-form-field {
            width: 100%;
        }

        .form-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly attendanceService = inject(AttendanceService);
    private readonly employeeService = inject(EmployeeService);

    readonly message = signal<string | null>(null);

    readonly loading = this.attendanceService.loading;
    readonly employees = this.employeeService.activeEmployees;
    readonly trackByEmployeeId = (index: number, employee: any) => employee.id;

    attendanceForm: FormGroup = this.fb.group({
        employeeId: ['', Validators.required],
        fecha: [new Date(), Validators.required],
        horaEntrada: [''],
        horaSalida: [''],
        tipoRegistro: ['NORMAL', Validators.required],
        observaciones: ['']
    });

    async ngOnInit(): Promise<void> {
        await this.employeeService.loadEmployees();
    }

    async onSubmit(): Promise<void> {
        if (this.attendanceForm.invalid) return;

        try {
            const formValue = this.attendanceForm.value;
            const request = {
                ...formValue,
                fecha: formValue.fecha instanceof Date 
                    ? formValue.fecha.toISOString().split('T')[0]
                    : formValue.fecha
            };

            await this.attendanceService.registerAttendance(request);
            
            this.message.set('Asistencia registrada correctamente');
            setTimeout(() => this.message.set(null), 3000);
            this.attendanceForm.reset({
                fecha: new Date(),
                tipoRegistro: 'NORMAL'
            });
        } catch (error) {
            this.message.set('Error al registrar asistencia');
            setTimeout(() => this.message.set(null), 3000);
            console.error('Error al registrar asistencia', error);
        }
    }
}
