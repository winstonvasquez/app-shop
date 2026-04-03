import {
    Component, OnInit, inject, signal, computed, effect,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VacationService, VacationRequest } from '../../services/vacation.service';
import { EmployeeService } from '../../services/employee.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';

@Component({
    selector: 'app-vacation-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
    ],
    templateUrl: './vacation-list.component.html',
})
export class VacationListComponent implements OnInit {
    private readonly vacationService = inject(VacationService);
    private readonly employeeService = inject(EmployeeService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.vacationService.loading;
    readonly vacations = this.vacationService.vacations;
    readonly employees = this.employeeService.activeEmployees;

    // ── UI state ──────────────────────────────────────────────────────────────
    error           = signal<string | null>(null);
    showModal       = signal(false);
    showRejectModal = signal(false);
    submitting      = signal(false);
    submitError     = signal<string | null>(null);
    selectedId      = signal<number | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    filterEstado = signal('');
    searchQuery  = signal('');

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly filtered = computed(() => {
        const estado = this.filterEstado();
        const term   = this.searchQuery().toLowerCase();
        return this.vacations().filter(v => {
            const emp = this.employees().find(e => e.id === v.employeeId);
            const nombre = emp ? `${emp.nombres} ${emp.apellidos}`.toLowerCase() : '';
            const matchSearch = !term || nombre.includes(term);
            const matchEstado = !estado || v.estado === estado;
            return matchSearch && matchEstado;
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
        { label: 'Vacaciones' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<VacationRequest>[] = [
        {
            key: 'employeeId', label: 'Empleado',
            render: r => this.getEmployeeName(r.employeeId)
        },
        {
            key: 'fechaInicio', label: 'Fecha Inicio',
            render: r => new Date(r.fechaInicio + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'fechaFin', label: 'Fecha Fin',
            render: r => new Date(r.fechaFin + 'T00:00').toLocaleDateString('es-PE')
        },
        { key: 'dias', label: 'Días', align: 'center', render: r => `${r.dias} día${r.dias === 1 ? '' : 's'}` },
        { key: 'motivo', label: 'Motivo', render: r => r.motivo ?? '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${this.badgeEstado(r.estado)}">${r.estado}</span>`
        },
    ];

    actions: TableAction<VacationRequest>[] = [
        {
            label: 'Aprobar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'SOLICITADO',
            onClick: row => this.onApprove(row),
        },
        {
            label: 'Rechazar', icon: '✗', class: 'btn-delete',
            show: row => row.estado === 'SOLICITADO',
            onClick: row => this.openRejectModal(row),
        },
    ];

    // ── Form: Nueva Solicitud ─────────────────────────────────────────────────
    readonly vacacionForm = this.fb.group({
        employeeId:  [null as number | null, Validators.required],
        fechaInicio: ['', Validators.required],
        fechaFin:    ['', Validators.required],
        dias:        [0, [Validators.required, Validators.min(1)]],
        motivo:      [''],
    });

    // ── Form: Rechazo ─────────────────────────────────────────────────────────
    readonly rejectForm = this.fb.group({
        comentarios: ['', Validators.required],
    });

    // ── Effect: calcular días automáticamente ────────────────────────────────
    constructor() {
        effect(() => {
            const inicio = this.vacacionForm.get('fechaInicio')?.value;
            const fin    = this.vacacionForm.get('fechaFin')?.value;
            if (inicio && fin) {
                const d1 = new Date(inicio as string);
                const d2 = new Date(fin as string);
                const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
                if (diff > 0) {
                    this.vacacionForm.get('dias')?.setValue(diff, { emitEvent: false });
                }
            }
        });
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        Promise.all([
            this.vacationService.loadVacations(),
            this.employeeService.loadEmployees(),
        ]).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar datos');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    onSearch(event: Event): void {
        this.searchQuery.set((event.target as HTMLInputElement).value);
        this.currentPage.set(0);
    }

    onFilterEstado(event: Event): void {
        this.filterEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreateModal(): void {
        this.vacacionForm.reset({ dias: 0 });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.vacacionForm.reset();
    }

    openRejectModal(vacation: VacationRequest): void {
        this.selectedId.set(vacation.id);
        this.rejectForm.reset();
        this.showRejectModal.set(true);
    }

    closeRejectModal(): void {
        this.showRejectModal.set(false);
        this.selectedId.set(null);
    }

    async onSubmit(): Promise<void> {
        if (this.vacacionForm.invalid) {
            this.vacacionForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.vacacionForm.value;
            await this.vacationService.createVacationRequest({
                employeeId: val.employeeId!,
                fechaInicio: val.fechaInicio!,
                fechaFin:    val.fechaFin!,
                dias:        val.dias!,
                motivo:      val.motivo ?? undefined,
            });
            this.closeModal();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al crear solicitud');
        } finally {
            this.submitting.set(false);
        }
    }

    async onApprove(vacation: VacationRequest): Promise<void> {
        if (!confirm(`¿Aprobar la solicitud de "${this.getEmployeeName(vacation.employeeId)}"?`)) return;
        try {
            await this.vacationService.approveOrReject(vacation.id, { approved: true, comentarios: 'Aprobado' });
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al aprobar');
        }
    }

    async onRejectSubmit(): Promise<void> {
        if (this.rejectForm.invalid) {
            this.rejectForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        try {
            await this.vacationService.approveOrReject(this.selectedId()!, {
                approved: false,
                comentarios: this.rejectForm.value.comentarios ?? '',
            });
            this.closeRejectModal();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al rechazar');
        } finally {
            this.submitting.set(false);
        }
    }

    getControl(form: 'vacation' | 'reject', name: string): FormControl {
        const fg: FormGroup = form === 'vacation' ? this.vacacionForm : this.rejectForm;
        return fg.get(name) as FormControl;
    }

    getEmployeeName(id: number): string {
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.nombres} ${emp.apellidos}` : `Empleado #${id}`;
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            SOLICITADO: 'warning',
            APROBADO:   'success',
            RECHAZADO:  'error',
            TOMADO:     'neutral',
            CANCELADO:  'neutral',
        };
        return map[estado] ?? 'neutral';
    }
}
