import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { DepartmentService } from '../../services/department.service';
import { PositionService } from '../../services/position.service';
import { Employee, EmployeeRequest } from '../../models/employee.model';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { employeeSelectSource, departmentSelectSource, positionSelectSource } from '../../components/select-sources';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PAGINATION } from '@shared/constants/app.constants';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { Router } from '@angular/router';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-employee-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
        CatalogSelectComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './employee-list.component.html',
})
export class EmployeeListComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly positionService = inject(PositionService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly catalog = inject(CatalogService);

    // ── Server search-select sources ──────────────────────────────────────────
    readonly departmentSource = departmentSelectSource(this.departmentService);
    readonly positionSource   = positionSelectSource(this.positionService);
    readonly supervisorSource = employeeSelectSource(this.employeeService);

    // Se mantiene para el filtro de departamento del toolbar del data-table.
    readonly departments = this.departmentService.activeDepartments;

    // Listas para los selects de filtro "Puesto" y "Supervisor" del toolbar (carga eager, no search-select).
    positionsFiltro = signal<{ id: number; nombre: string }[]>([]);
    supervisoresFiltro = signal<{ id: number; nombres: string; apellidos: string }[]>([]);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading   = this.employeeService.loading;
    readonly employees = this.employeeService.employees;

    // ── UI state ──────────────────────────────────────────────────────────────
    error            = signal<string | null>(null);
    showModal        = signal(false);
    editMode         = signal(false);
    submitting       = signal(false);
    submitError      = signal<string | null>(null);
    selectedEmployee = signal<Employee | null>(null);

    // ── Filters (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery  = signal('');
    filterEstado = signal('');
    filterDepartmentId = signal<number | null>(null);
    filterPositionId = signal<number | null>(null);
    filterSupervisorId = signal<number | null>(null);
    filterTipoDocumento = signal('');
    filterSistemaPrevisional = signal('');
    filterAfpNombre = signal('');
    filterGenero = signal('');
    filterEstadoCivil = signal('');
    filterFechaIngresoDesde = signal<string | undefined>(undefined);
    filterFechaIngresoHasta = signal<string | undefined>(undefined);
    filterFechaSalidaDesde = signal<string | undefined>(undefined);
    filterFechaSalidaHasta = signal<string | undefined>(undefined);
    filterFechaNacimientoDesde = signal<string | undefined>(undefined);
    filterFechaNacimientoHasta = signal<string | undefined>(undefined);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única)
    // o de listas dinámicas ya cargadas (departamentos, puestos, supervisores).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_EMPLEADO', 'estado', 'Todos los estados'),
        signalFilter('departmentId', 'Todos los departamentos', this.departments,
            d => ({ value: d.id, label: d.nombre })),
        signalFilter('positionId', 'Todos los puestos', this.positionsFiltro,
            p => ({ value: p.id, label: p.nombre })),
        signalFilter('supervisorId', 'Todos los supervisores', this.supervisoresFiltro,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento'),
        catalogFilter(this.catalog, 'SISTEMA_PREVISIONAL', 'sistemaPrevisional', 'Sistema previsional'),
        catalogFilter(this.catalog, 'AFP', 'afpNombre', 'AFP'),
        catalogFilter(this.catalog, 'GENERO', 'genero', 'Género'),
        catalogFilter(this.catalog, 'ESTADO_CIVIL', 'estadoCivil', 'Estado civil'),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaIngreso', label: 'Fecha de ingreso' },
        { field: 'fechaSalida', label: 'Fecha de cese' },
        { field: 'fechaNacimiento', label: 'Fecha de nacimiento' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /hr/api/employees/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/employees/export`,
        filename: 'empleados',
        params: () => ({
            search: this.searchQuery(),
            status: this.filterEstado(),
            departmentId: this.filterDepartmentId() ?? undefined,
            positionId: this.filterPositionId() ?? undefined,
            supervisorId: this.filterSupervisorId() ?? undefined,
            tipoDocumento: this.filterTipoDocumento(),
            sistemaPrevisional: this.filterSistemaPrevisional(),
            afpNombre: this.filterAfpNombre(),
            genero: this.filterGenero(),
            estadoCivil: this.filterEstadoCivil(),
            fechaIngresoDesde: this.filterFechaIngresoDesde(),
            fechaIngresoHasta: this.filterFechaIngresoHasta(),
            fechaSalidaDesde: this.filterFechaSalidaDesde(),
            fechaSalidaHasta: this.filterFechaSalidaHasta(),
            fechaNacimientoDesde: this.filterFechaNacimientoDesde(),
            fechaNacimientoHasta: this.filterFechaNacimientoHasta(),
        }),
    };

    // ── Pagination (server-side) ──────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Empleados' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Employee>[] = [
        {
            key: 'codigoEmpleado', label: 'Código', sortable: true, width: '100px',
            html: true, render: r => `<span class="font-mono text-sm">${r.codigoEmpleado}</span>`
        },
        {
            key: 'nombres', label: 'Nombre Completo', sortable: true,
            render: r => `${r.nombres} ${r.apellidos}`
        },
        { key: 'documentoIdentidad', label: 'DNI/Doc', width: '110px' },
        { key: 'departmentName', label: 'Departamento', render: r => r.departmentName ?? r.area ?? '—' },
        { key: 'positionName',   label: 'Puesto',       render: r => r.positionName ?? r.cargo ?? '—' },
        {
            key: 'estado', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${this.badgeEstado(r.estado)}">${this.catalog.label('ESTADO_EMPLEADO', r.estado)}</span>`
        },
    ];

    actions: TableAction<Employee>[] = [
        {
            label: 'Ver', icon: '👁', class: 'btn-view',
            onClick: row => this.router.navigate(['/admin/rrhh/employees', row.id, 'detail']),
        },
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: row => this.openEditModal(row),
        },
        {
            label: 'Desactivar', icon: '🚫', class: 'btn-delete',
            show: row => row.estado === 'ACTIVO',
            onClick: row => this.onDeactivate(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly employeeForm = this.fb.group({
        codigoEmpleado:     ['', [Validators.required, Validators.maxLength(20)]],
        nombres:            ['', [Validators.required, Validators.maxLength(100)]],
        apellidos:          ['', [Validators.required, Validators.maxLength(100)]],
        documentoIdentidad: ['', [Validators.required, Validators.maxLength(20)]],
        fechaIngreso:       ['', Validators.required],
        cargo:              [''],
        area:               [''],
        email:              ['', Validators.email],
        telefono:           [''],
        estado:             ['ACTIVO'],
        departmentId:       [null as number | null],
        positionId:         [null as number | null],
        supervisorId:       [null as number | null],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.departmentService.loadDepartments().catch(() => { /* dropdown depto opcional */ });
        this.loadPositionsFiltro();
        this.loadSupervisoresFiltro();
        this.loadPage();
    }

    /** Puestos para el select de filtro del toolbar (lista acotada, no requiere server-search). */
    private loadPositionsFiltro(): void {
        this.positionService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.positionsFiltro.set(res.content ?? []))
            .catch(() => this.positionsFiltro.set([]));
    }

    /** Supervisores (empleados) para el select de filtro del toolbar. */
    private loadSupervisoresFiltro(): void {
        this.employeeService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.supervisoresFiltro.set(res.content ?? []))
            .catch(() => this.supervisoresFiltro.set([]));
    }

    /** Carga la página actual server-side (search + TODOS los filtros avanzados + 20/pág). */
    private loadPage(): void {
        this.employeeService.loadEmployeesPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            status: this.filterEstado() || undefined,
            departmentId: this.filterDepartmentId(),
            positionId: this.filterPositionId(),
            supervisorId: this.filterSupervisorId(),
            tipoDocumento: this.filterTipoDocumento() || undefined,
            sistemaPrevisional: this.filterSistemaPrevisional() || undefined,
            afpNombre: this.filterAfpNombre() || undefined,
            genero: this.filterGenero() || undefined,
            estadoCivil: this.filterEstadoCivil() || undefined,
            fechaIngresoDesde: this.filterFechaIngresoDesde(),
            fechaIngresoHasta: this.filterFechaIngresoHasta(),
            fechaSalidaDesde: this.filterFechaSalidaDesde(),
            fechaSalidaHasta: this.filterFechaSalidaHasta(),
            fechaNacimientoDesde: this.filterFechaNacimientoDesde(),
            fechaNacimientoHasta: this.filterFechaNacimientoHasta(),
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar empleados');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    /** La búsqueda por texto también va al backend, no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':             this.filterEstado.set(valor); break;
            case 'departmentId':       this.filterDepartmentId.set(event.value != null ? Number(event.value) : null); break;
            case 'positionId':         this.filterPositionId.set(event.value != null ? Number(event.value) : null); break;
            case 'supervisorId':       this.filterSupervisorId.set(event.value != null ? Number(event.value) : null); break;
            case 'tipoDocumento':      this.filterTipoDocumento.set(valor); break;
            case 'sistemaPrevisional': this.filterSistemaPrevisional.set(valor); break;
            case 'afpNombre':          this.filterAfpNombre.set(valor); break;
            case 'genero':             this.filterGenero.set(valor); break;
            case 'estadoCivil':        this.filterEstadoCivil.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        switch (event.field) {
            case 'fechaIngreso':
                this.filterFechaIngresoDesde.set(event.from ?? undefined);
                this.filterFechaIngresoHasta.set(event.to ?? undefined);
                break;
            case 'fechaSalida':
                this.filterFechaSalidaDesde.set(event.from ?? undefined);
                this.filterFechaSalidaHasta.set(event.to ?? undefined);
                break;
            case 'fechaNacimiento':
                this.filterFechaNacimientoDesde.set(event.from ?? undefined);
                this.filterFechaNacimientoHasta.set(event.to ?? undefined);
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
        this.filterDepartmentId.set(null);
        this.filterPositionId.set(null);
        this.filterSupervisorId.set(null);
        this.filterTipoDocumento.set('');
        this.filterSistemaPrevisional.set('');
        this.filterAfpNombre.set('');
        this.filterGenero.set('');
        this.filterEstadoCivil.set('');
        this.filterFechaIngresoDesde.set(undefined);
        this.filterFechaIngresoHasta.set(undefined);
        this.filterFechaSalidaDesde.set(undefined);
        this.filterFechaSalidaHasta.set(undefined);
        this.filterFechaNacimientoDesde.set(undefined);
        this.filterFechaNacimientoHasta.set(undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedEmployee.set(null);
        this.employeeForm.reset({ estado: 'ACTIVO' });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(employee: Employee): void {
        this.editMode.set(true);
        this.selectedEmployee.set(employee);
        this.employeeForm.patchValue({
            codigoEmpleado:     employee.codigoEmpleado,
            nombres:            employee.nombres,
            apellidos:          employee.apellidos,
            documentoIdentidad: employee.documentoIdentidad,
            fechaIngreso:       employee.fechaIngreso,
            cargo:              employee.cargo     ?? '',
            area:               employee.area      ?? '',
            email:              employee.email     ?? '',
            telefono:           employee.telefono  ?? '',
            estado:             employee.estado,
            departmentId:       employee.departmentId ?? null,
            positionId:         employee.positionId   ?? null,
            supervisorId:       employee.supervisorId ?? null,
        });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.employeeForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.employeeForm.invalid) {
            this.employeeForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.employeeForm.value as Record<string, unknown>;
            const original = this.selectedEmployee();
            if (this.editMode() && original) {
                // PUT = reemplazo completo: mergeamos los campos del empleado original
                // (género, dirección, educación, AFP, departamento/puesto/supervisor, etc.)
                // con los editados en el form, para que el backend NO los sobrescriba a null.
                const request = { ...original, ...val } as unknown as EmployeeRequest;
                await this.employeeService.updateEmployee(original.id, request);
            } else {
                await this.employeeService.createEmployee(val as never);
            }
            this.closeModal();
            this.loadPage();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar empleado');
        } finally {
            this.submitting.set(false);
        }
    }

    async onDeactivate(employee: Employee): Promise<void> {
        if (!confirm(`¿Desactivar a "${employee.nombres} ${employee.apellidos}"?`)) return;
        try {
            await this.employeeService.deactivateEmployee(employee.id);
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al desactivar empleado');
        }
    }

    getControl(name: string): FormControl {
        return this.employeeForm.get(name) as FormControl;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            ACTIVO:    'success',
            INACTIVO:  'neutral',
            SUSPENDIDO:'warning',
            CESADO:    'error',
        };
        return map[estado] ?? 'neutral';
    }
}

