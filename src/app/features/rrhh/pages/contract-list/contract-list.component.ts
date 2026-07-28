import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import {
    Contract, ContractType, ContractStatus, WorkingDay,
} from '../../models/contract.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PAGINATION } from '@shared/constants/app.constants';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource } from '../../components/select-sources';
import { MONEDA, CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { CatalogService } from '@core/services/catalog.service';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-contract-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './contract-list.component.html',
})
export class ContractListComponent implements OnInit {
    private readonly contractService = inject(ContractService);
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading = this.contractService.loading;
    readonly contracts = this.contractService.contracts;
    /** Fuente server-side del search-select de empleado (últimos registrados + búsqueda paginada). */
    readonly employeeSource = employeeSelectSource(this.employeeService);
    /** Departamentos activos para el select de filtro del toolbar. */
    readonly departments = this.departmentService.activeDepartments;

    /** Empleados para el select de filtro "Empleado" del toolbar (lista acotada, no requiere server-search). */
    empleadosFiltro = signal<{ id: number; nombres: string; apellidos: string }[]>([]);

    // ── UI state ──────────────────────────────────────────────────────────────
    error              = signal<string | null>(null);
    showModal          = signal(false);
    showTerminateModal = signal(false);
    editMode           = signal(false);
    submitting         = signal(false);
    submitError        = signal<string | null>(null);
    selectedContract   = signal<Contract | null>(null);

    // ── Filters (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery  = signal('');
    filterStatus = signal('');
    filterType   = signal('');
    filterJornadaLaboral = signal('');
    filterMoneda = signal('');
    filterEmployeeId = signal<number | null>(null);
    filterDepartmentId = signal<number | null>(null);
    filterFechaInicioDesde = signal<string | undefined>(undefined);
    filterFechaInicioHasta = signal<string | undefined>(undefined);
    filterFechaFinDesde = signal<string | undefined>(undefined);
    filterFechaFinHasta = signal<string | undefined>(undefined);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única)
    // o de listas dinámicas ya cargadas (empleados, departamentos).
    contratoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_CONTRATO_LABORAL', 'status', 'Estado'),
        catalogFilter(this.catalog, 'TIPO_CONTRATO', 'type', 'Tipo'),
        catalogFilter(this.catalog, 'JORNADA_LABORAL', 'jornadaLaboral', 'Jornada laboral'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('employeeId', 'Empleado', this.empleadosFiltro,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('departmentId', 'Departamento', this.departments,
            d => ({ value: d.id, label: d.nombre })),
    ];

    /** Rango sobre fecha fin es el filtro de mayor valor (identifica contratos por vencer). */
    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaInicio', label: 'Fecha de inicio' },
        { field: 'fechaFin', label: 'Fecha de vencimiento' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /hr/api/contracts/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/contracts/export`,
        filename: 'contratos',
        params: () => ({
            search: this.searchQuery(),
            status: this.filterStatus(),
            type: this.filterType(),
            jornadaLaboral: this.filterJornadaLaboral(),
            moneda: this.filterMoneda(),
            employeeId: this.filterEmployeeId() ?? undefined,
            departmentId: this.filterDepartmentId() ?? undefined,
            fechaInicioDesde: this.filterFechaInicioDesde(),
            fechaInicioHasta: this.filterFechaInicioHasta(),
            fechaFinDesde: this.filterFechaFinDesde(),
            fechaFinHasta: this.filterFechaFinHasta(),
        }),
    };

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(20);

    // ── Computed / server-side pagination ─────────────────────────────────────
    // Nota: expiringCount refleja los contratos por vencer de la página actual.
    readonly expiringCount = computed(() =>
        this.contracts().filter(c => c.expiringSoon).length
    );

    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Contratos' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Contract>[] = [
        { key: 'employeeName', label: 'Empleado', sortable: true },
        {
            key: 'tipoContrato', label: 'Tipo', sortable: true,
            render: r => this.catalog.labelFn('TIPO_CONTRATO')(r.tipoContrato),
        },
        { key: 'fechaInicio', label: 'Inicio', sortable: true },
        { key: 'fechaFin', label: 'Fin', render: r => r.fechaFin ?? '—' },
        {
            key: 'salarioBase', label: 'Salario', align: 'right',
            render: r => `${r.moneda === MONEDA.USD ? CURRENCY_DISPLAY.SYMBOL_USD : CURRENCY_DISPLAY.SYMBOL_PEN} ${r.salarioBase.toLocaleString(CURRENCY_DISPLAY.LOCALE, { minimumFractionDigits: 2 })}`,
        },
        {
            key: 'jornadaLaboral', label: 'Jornada',
            render: r => this.catalog.labelFn('JORNADA_LABORAL')(r.jornadaLaboral),
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => {
                const badge = r.estado === 'ACTIVO' ? 'success'
                    : r.estado === 'FINALIZADO' ? 'neutral'
                    : r.estado === 'RENOVADO' ? 'accent'
                    : 'warning';
                const extra = r.expiringSoon ? ' <span class="badge badge-warning" style="margin-left:4px">Por vencer</span>' : '';
                return `<span class="badge badge-${badge}">${this.catalog.label('ESTADO_CONTRATO_LABORAL', r.estado)}</span>${extra}`;
            },
        },
    ];

    actions: TableAction<Contract>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            show: row => row.estado === 'ACTIVO' || row.estado === 'SUSPENDIDO',
            onClick: row => this.openEditModal(row),
        },
        {
            label: 'Finalizar', icon: '🛑', class: 'btn-delete',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.openTerminateModal(row),
        },
        {
            label: 'Renovar', icon: '🔄', class: 'btn-view',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.openRenewModal(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly contractForm = this.fb.group({
        employeeId:          [null as number | null, Validators.required],
        tipoContrato:        [null as ContractType | null, Validators.required],
        fechaInicio:         ['', Validators.required],
        fechaFin:            [''],
        salarioBase:         [null as number | null, [Validators.required, Validators.min(0)]],
        moneda:              [MONEDA.PEN as string],
        jornadaLaboral:      [null as WorkingDay | null, Validators.required],
        horasSemanales:      [48, [Validators.required, Validators.min(1), Validators.max(60)]],
        periodoPruebaMeses:  [null as number | null],
        documentoContratoUrl: [''],
    });

    /**
     * Reapuntar el contrato a otro empleado descuadra planilla, vacaciones y
     * liquidaciones ya calculadas → el empleado se muestra bloqueado al editar/renovar.
     */
    private static readonly CAMPOS_BLOQUEADOS = ['employeeId'];

    /**
     * Al EDITAR (no al renovar) además se bloquean fechaInicio y salarioBase: el motor
     * de planilla lee el salario vigente del contrato ACTIVO para calcular boletas ya
     * emitidas — cambiarlo en caliente las desincroniza retroactivamente. El canal
     * correcto para un cambio de sueldo es el tab Salarios de employee-detail o
     * "Renovar contrato" (crea un contrato NUEVO con sus propios valores, por eso
     * openRenewModal sigue usando solo CAMPOS_BLOQUEADOS, sin estos dos).
     */
    private static readonly CAMPOS_BLOQUEADOS_EDICION = [
        ...ContractListComponent.CAMPOS_BLOQUEADOS, 'fechaInicio', 'salarioBase',
    ];

    /**
     * Aplica los bloqueos del modo en el que se abre el formulario.
     *
     * <p>Es obligatorio pasar por aquí y no llamar a `bloquearEnEdicion` directamente:
     * ese helper solo toca los campos que recibe, así que un candado puesto en un modo
     * sobrevive al siguiente. Concretamente, tras editar un contrato (que bloquea
     * fechaInicio y salarioBase), abrir "Nuevo contrato" dejaba fechaInicio deshabilitada
     * — y un control deshabilitado no se valida, así que `form.valid` era true, el
     * `getRawValue()` mandaba `fechaInicio: null` y el `@NotNull` del backend respondía
     * 400. En "Renovar" el que quedaba bloqueado era salarioBase, que es justo lo que una
     * renovación necesita poder cambiar.</p>
     *
     * <p>Por eso se reabre SIEMPRE el superset antes de cerrar lo que toque.</p>
     */
    private aplicarBloqueos(campos: string[]): void {
        bloquearEnEdicion(this.contractForm, ContractListComponent.CAMPOS_BLOQUEADOS_EDICION, false);
        bloquearEnEdicion(this.contractForm, campos, true);
    }

    readonly terminateMotivo = new FormControl('', Validators.required);

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        // El select de empleado del FORM carga sus opciones bajo demanda (server-side).
        this.departmentService.loadDepartments().catch(() => { /* dropdown depto opcional */ });
        this.loadEmpleadosFiltro();
        this.loadPage();
    }

    /** Empleados para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    private loadEmpleadosFiltro(): void {
        this.employeeService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.empleadosFiltro.set(res.content ?? []))
            .catch(() => this.empleadosFiltro.set([]));
    }

    /** Carga la página actual server-side (search + TODOS los filtros avanzados + 20/pág). */
    private loadPage(): void {
        this.contractService.loadContractsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            status: this.filterStatus() || undefined,
            type: this.filterType() || undefined,
            jornadaLaboral: this.filterJornadaLaboral() || undefined,
            moneda: this.filterMoneda() || undefined,
            employeeId: this.filterEmployeeId(),
            departmentId: this.filterDepartmentId(),
            fechaInicioDesde: this.filterFechaInicioDesde(),
            fechaInicioHasta: this.filterFechaInicioHasta(),
            fechaFinDesde: this.filterFechaFinDesde(),
            fechaFinHasta: this.filterFechaFinHasta(),
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar contratos');
        });
    }

    // ── Filter handlers ───────────────────────────────────────────────────────
    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const value = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'status':         this.filterStatus.set(value); break;
            case 'type':           this.filterType.set(value); break;
            case 'jornadaLaboral': this.filterJornadaLaboral.set(value); break;
            case 'moneda':         this.filterMoneda.set(value); break;
            case 'employeeId':     this.filterEmployeeId.set(event.value != null ? Number(event.value) : null); break;
            case 'departmentId':   this.filterDepartmentId.set(event.value != null ? Number(event.value) : null); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaInicio':
                this.filterFechaInicioDesde.set(event.from ?? undefined);
                this.filterFechaInicioHasta.set(event.to ?? undefined);
                break;
            case 'fechaFin':
                this.filterFechaFinDesde.set(event.from ?? undefined);
                this.filterFechaFinHasta.set(event.to ?? undefined);
                break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterStatus.set('');
        this.filterType.set('');
        this.filterJornadaLaboral.set('');
        this.filterMoneda.set('');
        this.filterEmployeeId.set(null);
        this.filterDepartmentId.set(null);
        this.filterFechaInicioDesde.set(undefined);
        this.filterFechaInicioHasta.set(undefined);
        this.filterFechaFinDesde.set(undefined);
        this.filterFechaFinHasta.set(undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    // ── Modal handlers ────────────────────────────────────────────────────────
    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedContract.set(null);
        this.contractForm.reset({ moneda: MONEDA.PEN as string, horasSemanales: 48 });
        // Alta libre: se reabre todo (ver aplicarBloqueos).
        this.aplicarBloqueos([]);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(contract: Contract): void {
        this.editMode.set(true);
        this.selectedContract.set(contract);
        this.contractForm.patchValue({
            employeeId:          contract.employeeId,
            tipoContrato:        contract.tipoContrato,
            fechaInicio:         contract.fechaInicio,
            fechaFin:            contract.fechaFin ?? '',
            salarioBase:         contract.salarioBase,
            moneda:              contract.moneda,
            jornadaLaboral:      contract.jornadaLaboral,
            horasSemanales:      contract.horasSemanales,
            periodoPruebaMeses:  contract.periodoPruebaMeses ?? null,
            documentoContratoUrl: contract.documentoContratoUrl ?? '',
        });
        this.aplicarBloqueos(ContractListComponent.CAMPOS_BLOQUEADOS_EDICION);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openRenewModal(contract: Contract): void {
        this.editMode.set(false);
        this.selectedContract.set(contract);
        this.contractForm.reset({
            employeeId:     contract.employeeId,
            tipoContrato:   contract.tipoContrato,
            moneda:         contract.moneda,
            jornadaLaboral: contract.jornadaLaboral,
            horasSemanales: contract.horasSemanales,
            salarioBase:    contract.salarioBase,
        });
        // Renovación: el contrato nuevo pertenece al MISMO empleado, no se puede reapuntar,
        // pero fechaInicio y salarioBase SÍ deben quedar editables (es un contrato nuevo).
        this.aplicarBloqueos(ContractListComponent.CAMPOS_BLOQUEADOS);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openTerminateModal(contract: Contract): void {
        this.selectedContract.set(contract);
        this.terminateMotivo.reset();
        this.showTerminateModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.contractForm.reset();
    }

    closeTerminateModal(): void {
        this.showTerminateModal.set(false);
        this.selectedContract.set(null);
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    async onSubmit(): Promise<void> {
        if (this.contractForm.invalid) {
            this.contractForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.contractForm.getRawValue();
            const request = {
                employeeId: val.employeeId!,
                tipoContrato: val.tipoContrato!,
                fechaInicio: val.fechaInicio!,
                fechaFin: val.fechaFin || undefined,
                salarioBase: val.salarioBase!,
                moneda: val.moneda ?? MONEDA.PEN,
                jornadaLaboral: val.jornadaLaboral!,
                horasSemanales: val.horasSemanales!,
                periodoPruebaMeses: val.periodoPruebaMeses ?? undefined,
                documentoContratoUrl: val.documentoContratoUrl || undefined,
            };
            const sel = this.selectedContract();
            if (this.editMode() && sel) {
                await this.contractService.updateContract(sel.id, request);
            } else if (sel && !this.editMode()) {
                // Renew: selectedContract is set but editMode is false
                await this.contractService.renewContract(sel.id, request);
            } else {
                await this.contractService.createContract(request);
            }
            this.closeModal();
            this.loadPage();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar contrato');
        } finally {
            this.submitting.set(false);
        }
    }

    async onTerminate(): Promise<void> {
        const sel = this.selectedContract();
        if (!sel || this.terminateMotivo.invalid) {
            this.terminateMotivo.markAsTouched();
            return;
        }
        this.submitting.set(true);
        try {
            await this.contractService.terminateContract(sel.id, this.terminateMotivo.value!);
            this.closeTerminateModal();
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al finalizar contrato');
        } finally {
            this.submitting.set(false);
        }
    }

    getControl(name: string): FormControl {
        return this.contractForm.get(name) as FormControl;
    }
}

