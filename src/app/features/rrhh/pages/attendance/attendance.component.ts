import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../services/employee.service';
import { Attendance } from '../../models/attendance.model';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';

type TipoRegistro = 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';

@Component({
    selector: 'app-attendance',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, DataTableComponent],
    templateUrl: './attendance.component.html'
})
export class AttendanceComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly attendanceService = inject(AttendanceService);
    private readonly employeeService = inject(EmployeeService);

    readonly message = signal<string | null>(null);
    readonly messageType = signal<'success' | 'error'>('success');
    readonly loading = this.attendanceService.loading;
    readonly employees = this.employeeService.activeEmployees;
    readonly attendances = signal<Attendance[]>([]);

    readonly tipoRegistroOptions = [
        { value: 'NORMAL',     label: 'Normal' },
        { value: 'TARDANZA',   label: 'Tardanza' },
        { value: 'FALTA',      label: 'Falta' },
        { value: 'PERMISO',    label: 'Permiso' },
        { value: 'LICENCIA',   label: 'Licencia' },
        { value: 'VACACIONES', label: 'Vacaciones' },
    ];

    columns: TableColumn<Attendance>[] = [
        { key: 'employeeId', label: 'Empleado', render: (row) => this.getEmployeeName(row.employeeId) },
        { key: 'horaEntrada', label: 'Entrada', render: (row) => row.horaEntrada ?? '—' },
        { key: 'horaSalida',  label: 'Salida',  render: (row) => row.horaSalida  ?? '—' },
        {
            key: 'tipoRegistro', label: 'Tipo', html: true,
            render: (row) => `<span class="${this.badgeAsistencia(row.tipoRegistro)}">${row.tipoRegistro}</span>`
        },
        { key: 'observaciones', label: 'Observaciones', render: (row) => row.observaciones ?? '—' },
    ];

    attendanceForm: FormGroup = this.fb.group({
        employeeId: ['', Validators.required],
        fecha: [new Date().toISOString().split('T')[0], Validators.required],
        horaEntrada: [''],
        horaSalida: [''],
        tipoRegistro: ['NORMAL', Validators.required],
        observaciones: ['']
    });

    async ngOnInit(): Promise<void> {
        try {
            await this.employeeService.loadEmployees();
        } catch {
            // servicio no disponible
        }
        // Mostrar registros locales del servicio
        this.attendances.set(this.attendanceService.attendances());
    }

    getEmployeeName(id: number): string {
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
    }

    badgeAsistencia(tipo: TipoRegistro): string {
        const map: Record<TipoRegistro, string> = {
            NORMAL: 'badge badge-success',
            TARDANZA: 'badge badge-warning',
            FALTA: 'badge badge-error',
            PERMISO: 'badge badge-neutral',
            LICENCIA: 'badge badge-neutral',
            VACACIONES: 'badge badge-neutral'
        };
        return map[tipo] ?? 'badge';
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

            const registered = await this.attendanceService.registerAttendance(request);
            this.attendances.update(list => [...list, registered]);
            this.messageType.set('success');
            this.message.set('Asistencia registrada correctamente');
            setTimeout(() => this.message.set(null), 3000);
            this.attendanceForm.reset({
                fecha: new Date().toISOString().split('T')[0],
                tipoRegistro: 'NORMAL'
            });
        } catch {
            this.messageType.set('error');
            this.message.set('Error al registrar asistencia');
            setTimeout(() => this.message.set(null), 3000);
        }
    }
}
