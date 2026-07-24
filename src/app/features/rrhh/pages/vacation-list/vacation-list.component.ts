import {
    Component, OnInit, inject, signal, effect,
    ChangeDetectionStrategy
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VacationService, VacationRequest } from '../../services/vacation.service';
import { EmployeeService } from '../../services/employee.service';
import { CatalogService } from '@core/services/catalog.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';

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
        ButtonComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './vacation-list.component.html',
})
export class VacationListComponent implements OnInit {
    private readonly vacationService = inject(VacationService);
    private readonly employeeService = inject(EmployeeService);
    private readonly catalog = inject(CatalogService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.vacationService.loading;
    readonly vacations = this.vacationService.vacations;
    // Se mantiene para resolver el nombre del empleado en la tabla (getEmployeeName).
    readonly employees = this.employeeService.activeEmployees;
    /** Fuente server-side del search-select de empleado del formulario. */
    readonly employeeSource = employeeSelectSource(this.employeeService);

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

    // Filtro de estado para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        { field: 'estado', label: 'Todos los estados', options: toObservable(this.catalog.options('ESTADO_VACACION')).pipe(
            map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
        ) }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales search + estado). Ver /hr/api/vacations/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/vacations/export`,
        filename: 'vacaciones',
        params: () => ({ search: this.searchQuery(), estado: this.filterEstado() }),
    };

    // ── Pagination (server-side) ──────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

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
            render: r => `<span class="badge badge-${this.badgeEstado(r.estado)}">${this.catalog.label('ESTADO_VACACION', r.estado)}</span>`
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
        this.employeeService.loadEmployees().catch(() => { /* nombres/empleado dropdown */ });
        this.loadPage();
    }

    /** Carga la página actual server-side (search + estado + 20/pág). */
    private loadPage(): void {
        this.vacationService.loadVacationsPaged(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery() || undefined,
            this.filterEstado() || undefined
        ).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar vacaciones');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filterEstado.set(event.value != null ? String(event.value) : '');
            this.currentPage.set(0);
            this.loadPage();
        }
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
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
            this.loadPage();
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
            this.loadPage();
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
            this.loadPage();
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
