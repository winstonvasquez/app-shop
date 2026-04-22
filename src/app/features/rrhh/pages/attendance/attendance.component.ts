import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../services/employee.service';
import { Attendance } from '../../models/attendance.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';

type TipoRegistro = 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';

@Component({
    selector: 'app-attendance',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
        AdminFormSectionComponent,
    ],
    templateUrl: './attendance.component.html',
})
export class AttendanceComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly attendanceService = inject(AttendanceService);
    private readonly employeeService = inject(EmployeeService);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.attendanceService.loading;
    readonly employees = this.employeeService.activeEmployees;
    readonly attendances = signal<Attendance[]>([]);

    // ── UI state ──────────────────────────────────────────────────────────────
    error       = signal<string | null>(null);
    showModal   = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    filterFecha = signal(new Date().toISOString().split('T')[0]);
    filterTipo  = signal('');

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(15);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly filtered = computed(() => {
        const fecha = this.filterFecha();
        const tipo  = this.filterTipo();
        return this.attendances().filter(a => {
            const matchFecha = !fecha || a.fecha === fecha;
            const matchTipo  = !tipo  || a.tipoRegistro === tipo;
            return matchFecha && matchTipo;
        });
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages    = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH',  url: '/admin/rrhh/dashboard' },
        { label: 'Asistencia' },
    ];

    // ── Tipos de registro ────────────────────────────────────────────────────
    readonly tipoRegistroOptions = [
        { value: 'NORMAL',     label: 'Normal'     },
        { value: 'TARDANZA',   label: 'Tardanza'   },
        { value: 'FALTA',      label: 'Falta'      },
        { value: 'PERMISO',    label: 'Permiso'    },
        { value: 'LICENCIA',   label: 'Licencia'   },
        { value: 'VACACIONES', label: 'Vacaciones' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Attendance>[] = [
        { key: 'employeeId', label: 'Empleado', render: row => this.getEmployeeName(row.employeeId) },
        { key: 'fecha',      label: 'Fecha',
          render: row => new Date(row.fecha + 'T00:00').toLocaleDateString('es-PE') },
        { key: 'horaEntrada', label: 'Entrada', render: row => row.horaEntrada ?? '—' },
        { key: 'horaSalida',  label: 'Salida',  render: row => row.horaSalida  ?? '—' },
        {
            key: 'tipoRegistro', label: 'Tipo', html: true,
            render: row => `<span class="badge badge-${this.badgeTipo(row.tipoRegistro)}">${row.tipoRegistro}</span>`
        },
        { key: 'observaciones', label: 'Observaciones', render: row => row.observaciones ?? '—' },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly attendanceForm = this.fb.group({
        employeeId:    [null as number | null, Validators.required],
        fecha:         [new Date().toISOString().split('T')[0], Validators.required],
        horaEntrada:   [''],
        horaSalida:    [''],
        tipoRegistro:  ['NORMAL', Validators.required],
        observaciones: [''],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    async ngOnInit(): Promise<void> {
        try {
            await this.employeeService.loadEmployees();
        } catch { /* servicio puede no estar disponible */ }
        this.attendances.set(this.attendanceService.attendances());
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    onFilterFecha(event: Event): void {
        this.filterFecha.set((event.target as HTMLInputElement).value);
        this.currentPage.set(0);
    }

    onFilterTipo(event: Event): void {
        this.filterTipo.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreateModal(): void {
        this.attendanceForm.reset({
            fecha: new Date().toISOString().split('T')[0],
            tipoRegistro: 'NORMAL',
        });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.attendanceForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.attendanceForm.invalid) {
            this.attendanceForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const formValue = this.attendanceForm.value;
            const request = {
                ...formValue,
                fecha: typeof formValue.fecha === 'string' ? formValue.fecha
                    : (formValue.fecha as unknown as Date)?.toISOString?.()?.split('T')[0] ?? '',
            };
            const registered = await this.attendanceService.registerAttendance(request as never);
            this.attendances.update(list => [...list, registered]);
            this.closeModal();
        } catch {
            this.submitError.set('Error al registrar asistencia. Verifique los datos.');
        } finally {
            this.submitting.set(false);
        }
    }

    getControl(name: string): FormControl {
        return this.attendanceForm.get(name) as FormControl;
    }

    getEmployeeName(id: number): string {
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
    }

    badgeTipo(tipo: TipoRegistro): string {
        const map: Record<TipoRegistro, string> = {
            NORMAL:     'success',
            TARDANZA:   'warning',
            FALTA:      'error',
            PERMISO:    'neutral',
            LICENCIA:   'neutral',
            VACACIONES: 'accent',
        };
        return map[tipo] ?? 'neutral';
    }
}
