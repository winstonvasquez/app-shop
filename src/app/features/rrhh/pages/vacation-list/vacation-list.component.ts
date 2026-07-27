import {
    Component, OnInit, inject, signal, effect,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VacationService, VacationRequest } from '../../services/vacation.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { LeaveBalance } from '../../models/leave-balance.model';
import { CatalogService } from '@core/services/catalog.service';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent,
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
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
    private readonly departmentService = inject(DepartmentService);
    readonly catalog = inject(CatalogService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.vacationService.loading;
    readonly vacations = this.vacationService.vacations;
    // Balance de vacaciones por año (sección aparte, no paginada).
    readonly balances        = this.vacationService.balances;
    readonly balancesLoading = this.vacationService.balancesLoading;
    readonly balanceYear     = signal(new Date().getFullYear());
    generatingBalance         = signal(false);
    // Se mantiene para resolver el nombre del empleado en la tabla (getEmployeeName).
    readonly employees = this.employeeService.activeEmployees;
    /** Departamentos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    readonly departamentosFiltro = signal<Department[]>([]);
    /** Fuente server-side del search-select de empleado del formulario. */
    readonly employeeSource = employeeSelectSource(this.employeeService);

    // ── UI state ──────────────────────────────────────────────────────────────
    error           = signal<string | null>(null);
    showModal       = signal(false);
    showRejectModal = signal(false);
    submitting      = signal(false);
    submitError     = signal<string | null>(null);
    selectedId      = signal<number | null>(null);

    // ── Filters (TODOS server-side) ────────────────────────────────────────────
    filterEstado             = signal('');
    filterTipoVacacion       = signal('');
    filterEmployeeId         = signal('');
    filterDepartmentId       = signal('');
    filterAprobadoPorId      = signal('');
    filterFechaInicioDesde   = signal<string | null>(null);
    filterFechaInicioHasta   = signal<string | null>(null);
    filterFechaFinDesde      = signal<string | null>(null);
    filterFechaFinHasta      = signal<string | null>(null);
    filterFechaAprobDesde    = signal<string | null>(null);
    filterFechaAprobHasta    = signal<string | null>(null);
    searchQuery  = signal('');

    // Filtros select del toolbar. Las opciones salen de erp_parameters / listas dinámicas.
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_VACACION', 'estado', 'Todos los estados'),
        catalogFilter(this.catalog, 'TIPO_VACACION', 'tipoVacacion', 'Tipo de vacación'),
        signalFilter('employeeId', 'Todos los empleados', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Todos los departamentos', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('aprobadoPorId', 'Aprobado por', this.employees,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
    ];

    /** Rangos de fecha para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaInicio', label: 'Inicio de vacaciones' },
        { field: 'fechaFin', label: 'Fin de vacaciones' },
        { field: 'fechaAprobacion', label: 'Fecha de aprobación' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta todos los filtros actuales). Ver /hr/api/vacations/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/vacations/export`,
        filename: 'vacaciones',
        params: () => ({
            search: this.searchQuery(),
            estado: this.filterEstado(),
            tipoVacacion: this.filterTipoVacacion(),
            employeeId: this.filterEmployeeId(),
            departmentId: this.filterDepartmentId(),
            aprobadoPorId: this.filterAprobadoPorId(),
            fechaInicioDesde: this.filterFechaInicioDesde() ?? undefined,
            fechaInicioHasta: this.filterFechaInicioHasta() ?? undefined,
            fechaFinDesde: this.filterFechaFinDesde() ?? undefined,
            fechaFinHasta: this.filterFechaFinHasta() ?? undefined,
            fechaAprobacionDesde: this.filterFechaAprobDesde() ?? undefined,
            fechaAprobacionHasta: this.filterFechaAprobHasta() ?? undefined,
        }),
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

    // Columnas de la tabla de balances (sección aparte, debajo de las solicitudes).
    balanceColumns: TableColumn<LeaveBalance>[] = [
        {
            key: 'employeeId', label: 'Empleado',
            render: r => r.employeeName ?? this.getEmployeeName(r.employeeId)
        },
        { key: 'diasGanados', label: 'Días Ganados', align: 'center', render: r => `${r.diasGanados}` },
        { key: 'diasUsados', label: 'Días Tomados', align: 'center', render: r => `${r.diasUsados}` },
        { key: 'diasDisponibles', label: 'Días Disponibles', align: 'center', render: r => `${r.diasDisponibles}` },
        { key: 'diasVencidos', label: 'Días Vencidos', align: 'center', render: r => `${r.diasVencidos}` },
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
        this.loadDepartamentosFiltro();
        this.loadPage();
        this.loadBalances();
    }

    /** Departamentos para el select de filtro (no muta el estado compartido de DepartmentService). */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    /** Carga los balances de vacaciones del año seleccionado. */
    private loadBalances(): void {
        this.vacationService.getBalancesByYear(this.balanceYear()).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar balances de vacaciones');
        });
    }

    /** Carga la página actual server-side con TODOS los filtros del toolbar. */
    private loadPage(): void {
        this.vacationService.loadVacationsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            tipoVacacion: this.filterTipoVacacion() || undefined,
            employeeId: this.filterEmployeeId() ? Number(this.filterEmployeeId()) : undefined,
            departmentId: this.filterDepartmentId() ? Number(this.filterDepartmentId()) : undefined,
            aprobadoPorId: this.filterAprobadoPorId() ? Number(this.filterAprobadoPorId()) : undefined,
            fechaInicioDesde: this.filterFechaInicioDesde() || undefined,
            fechaInicioHasta: this.filterFechaInicioHasta() || undefined,
            fechaFinDesde: this.filterFechaFinDesde() || undefined,
            fechaFinHasta: this.filterFechaFinHasta() || undefined,
            fechaAprobacionDesde: this.filterFechaAprobDesde() || undefined,
            fechaAprobacionHasta: this.filterFechaAprobHasta() || undefined,
        }).then(res => {
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
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':        this.filterEstado.set(valor); break;
            case 'tipoVacacion':  this.filterTipoVacacion.set(valor); break;
            case 'employeeId':    this.filterEmployeeId.set(valor); break;
            case 'departmentId':  this.filterDepartmentId.set(valor); break;
            case 'aprobadoPorId': this.filterAprobadoPorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaInicio':
                this.filterFechaInicioDesde.set(event.from);
                this.filterFechaInicioHasta.set(event.to);
                break;
            case 'fechaFin':
                this.filterFechaFinDesde.set(event.from);
                this.filterFechaFinHasta.set(event.to);
                break;
            case 'fechaAprobacion':
                this.filterFechaAprobDesde.set(event.from);
                this.filterFechaAprobHasta.set(event.to);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterTipoVacacion.set('');
        this.filterEmployeeId.set('');
        this.filterDepartmentId.set('');
        this.filterAprobadoPorId.set('');
        this.filterFechaInicioDesde.set(null);
        this.filterFechaInicioHasta.set(null);
        this.filterFechaFinDesde.set(null);
        this.filterFechaFinHasta.set(null);
        this.filterFechaAprobDesde.set(null);
        this.filterFechaAprobHasta.set(null);
        this.currentPage.set(0);
        this.loadPage();
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

    async onGenerateAnnualBalance(): Promise<void> {
        const year = this.balanceYear();
        if (!confirm(`¿Generar el balance de vacaciones ${year} para todos los empleados activos?`)) return;
        this.generatingBalance.set(true);
        this.error.set(null);
        try {
            const count = await this.vacationService.generateAnnualBalance(year);
            this.loadBalances();
            alert(`Se generaron ${count} balance(s) de vacaciones para el año ${year}.`);
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al generar el balance anual');
        } finally {
            this.generatingBalance.set(false);
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
