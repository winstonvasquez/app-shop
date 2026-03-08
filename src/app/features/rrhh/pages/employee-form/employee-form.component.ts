import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';

@Component({
    selector: 'app-employee-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    template: `
        <div class="form-container">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">{{ isEditMode() ? 'Editar Empleado' : 'Nuevo Empleado' }}</h2>
                </div>

                <div class="card-content">
                    <form [formGroup]="employeeForm" (ngSubmit)="onSubmit()">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="codigoEmpleado">Código Empleado *</label>
                                <input 
                                    id="codigoEmpleado"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="codigoEmpleado">
                                @if (employeeForm.get('codigoEmpleado')?.hasError('required') && employeeForm.get('codigoEmpleado')?.touched) {
                                    <span class="error-message">El código es obligatorio</span>
                                }
                            </div>

                            <div class="form-group">
                                <label for="documentoIdentidad">Documento Identidad *</label>
                                <input 
                                    id="documentoIdentidad"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="documentoIdentidad">
                                @if (employeeForm.get('documentoIdentidad')?.hasError('required') && employeeForm.get('documentoIdentidad')?.touched) {
                                    <span class="error-message">El documento es obligatorio</span>
                                }
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="nombres">Nombres *</label>
                                <input 
                                    id="nombres"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="nombres">
                                @if (employeeForm.get('nombres')?.hasError('required') && employeeForm.get('nombres')?.touched) {
                                    <span class="error-message">Los nombres son obligatorios</span>
                                }
                            </div>

                            <div class="form-group">
                                <label for="apellidos">Apellidos *</label>
                                <input 
                                    id="apellidos"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="apellidos">
                                @if (employeeForm.get('apellidos')?.hasError('required') && employeeForm.get('apellidos')?.touched) {
                                    <span class="error-message">Los apellidos son obligatorios</span>
                                }
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="fechaIngreso">Fecha de Ingreso *</label>
                                <input 
                                    id="fechaIngreso"
                                    type="date" 
                                    class="form-control" 
                                    formControlName="fechaIngreso">
                            </div>

                            <div class="form-group">
                                <label for="estado">Estado</label>
                                <select id="estado" class="form-control" formControlName="estado">
                                    <option value="ACTIVO">Activo</option>
                                    <option value="INACTIVO">Inactivo</option>
                                    <option value="SUSPENDIDO">Suspendido</option>
                                    <option value="CESADO">Cesado</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="cargo">Cargo</label>
                                <input 
                                    id="cargo"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="cargo">
                            </div>

                            <div class="form-group">
                                <label for="area">Área</label>
                                <input 
                                    id="area"
                                    type="text" 
                                    class="form-control" 
                                    formControlName="area">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input 
                                    id="email"
                                    type="email" 
                                    class="form-control" 
                                    formControlName="email">
                                @if (employeeForm.get('email')?.hasError('email') && employeeForm.get('email')?.touched) {
                                    <span class="error-message">Email inválido</span>
                                }
                            </div>

                            <div class="form-group">
                                <label for="telefono">Teléfono</label>
                                <input 
                                    id="telefono"
                                    type="tel" 
                                    class="form-control" 
                                    formControlName="telefono">
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-secondary" type="button" (click)="onCancel()">Cancelar</button>
                            <button 
                                class="btn btn-primary" 
                                type="submit" 
                                [disabled]="employeeForm.invalid || loading()">
                                @if (loading()) {
                                    Guardando...
                                } @else {
                                    {{ isEditMode() ? 'Actualizar' : 'Crear' }}
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .form-container {
            padding: 24px;
            max-width: 900px;
            margin: 0 auto;
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .form-row {
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
            gap: 12px;
            margin-top: 24px;
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly employeeService = inject(EmployeeService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly employeeId = signal<number | null>(null);

    employeeForm: FormGroup = this.fb.group({
        codigoEmpleado: ['', Validators.required],
        nombres: ['', Validators.required],
        apellidos: ['', Validators.required],
        documentoIdentidad: ['', Validators.required],
        fechaIngreso: ['', Validators.required],
        cargo: [''],
        area: [''],
        email: ['', Validators.email],
        telefono: [''],
        estado: ['ACTIVO']
    });

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.employeeId.set(+id);
            await this.loadEmployee(+id);
        }
    }

    private async loadEmployee(id: number): Promise<void> {
        try {
            const employee = await this.employeeService.getEmployeeById(id);
            this.employeeForm.patchValue({
                codigoEmpleado: employee.codigoEmpleado,
                nombres: employee.nombres,
                apellidos: employee.apellidos,
                documentoIdentidad: employee.documentoIdentidad,
                fechaIngreso: employee.fechaIngreso,
                cargo: employee.cargo,
                area: employee.area,
                email: employee.email,
                telefono: employee.telefono,
                estado: employee.estado
            });
        } catch (error) {
            console.error('Error al cargar empleado', error);
        }
    }

    async onSubmit(): Promise<void> {
        if (this.employeeForm.invalid) return;

        this.loading.set(true);
        try {
            const formValue = this.employeeForm.value;
            const request = {
                ...formValue,
                fechaIngreso: formValue.fechaIngreso instanceof Date 
                    ? formValue.fechaIngreso.toISOString().split('T')[0]
                    : formValue.fechaIngreso
            };

            if (this.isEditMode() && this.employeeId()) {
                await this.employeeService.updateEmployee(this.employeeId()!, request);
            } else {
                await this.employeeService.createEmployee(request);
            }

            this.router.navigate(['/rrhh/employees']);
        } catch (error) {
            console.error('Error al guardar empleado', error);
        } finally {
            this.loading.set(false);
        }
    }

    onCancel(): void {
        this.router.navigate(['/rrhh/employees']);
    }
}
