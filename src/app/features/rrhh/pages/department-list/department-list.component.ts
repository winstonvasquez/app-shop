import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService } from '../../services/department.service';
import { EmployeeService } from '../../services/employee.service';
import { Department } from '../../models/department.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource, departmentSelectSource } from '../../components/select-sources';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PAGINATION } from '@shared/constants/app.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-department-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './department-list.component.html',
})
export class DepartmentListComponent implements OnInit {
    private readonly departmentService = inject(DepartmentService);
    private readonly employeeService = inject(EmployeeService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading = this.departmentService.loading;
    readonly departments = this.departmentService.departments;
    /** Fuente server-side del search-select de "jefe" (managerId). */
    readonly employeeSource = employeeSelectSource(this.employeeService);
    /** Fuente server-side del search-select de "departamento padre" (excluye el que se edita). */
    readonly parentSource = departmentSelectSource(this.departmentService, {
        excludeId: () => this.selectedDept()?.id,
    });

    /** Listas para los selects de filtro "Jefe" y "Departamento padre" del toolbar (carga eager). */
    empleadosFiltro = signal<{ id: number; nombres: string; apellidos: string }[]>([]);
    departamentosFiltro = signal<{ id: number; nombre: string }[]>([]);

    // ── UI state ──────────────────────────────────────────────────────────────
    error            = signal<string | null>(null);
    showModal        = signal(false);
    editMode         = signal(false);
    submitting       = signal(false);
    submitError      = signal<string | null>(null);
    selectedDept     = signal<Department | null>(null);

    // ── Filters (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery  = signal('');
    filterActivo = signal('');
    filterManagerId = signal<number | null>(null);
    filterParentId = signal<number | null>(null);
    filterCreatedAtDesde = signal<string | undefined>(undefined);
    filterCreatedAtHasta = signal<string | undefined>(undefined);

    // ── Exportación server-side (XLSX/CSV) ──────────────────────────────────────
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/departments/export`,
        filename: 'departments',
        params: () => ({
            search: this.searchQuery(),
            activo: this.filterActivo(),
            managerId: this.filterManagerId() ?? undefined,
            parentId: this.filterParentId() ?? undefined,
            createdAtDesde: this.filterCreatedAtDesde(),
            createdAtHasta: this.filterCreatedAtHasta(),
        }),
    };

    // Filtros select del toolbar. "activo" es booleano (staticFilter); jefe/padre son listas dinámicas.
    estadoFilters: FilterConfig[] = [
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
        signalFilter('managerId', 'Jefe', this.empleadosFiltro,
            e => ({ value: e.id, label: `${e.nombres} ${e.apellidos}` })),
        signalFilter('parentId', 'Departamento padre', this.departamentosFiltro,
            d => ({ value: d.id, label: d.nombre })),
    ];

    /** Rango de fecha de creación (baja prioridad: entidad maestra, volumen bajo). */
    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de creación' },
    ];

    // ── Pagination (server-side) ──────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin',  url: '/admin' },
        { label: 'RRHH',   url: '/admin/rrhh/dashboard' },
        { label: 'Departamentos' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Department>[] = [
        {
            key: 'codigo', label: 'Código', sortable: true, width: '100px',
            html: true, render: r => `<span class="font-mono text-sm">${r.codigo}</span>`
        },
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'parentName', label: 'Dept. Padre', render: r => r.parentName ?? '—' },
        { key: 'managerName', label: 'Jefe', render: r => r.managerName ?? '—' },
        {
            key: 'employeeCount', label: 'Empleados', align: 'center',
            render: r => `${r.employeeCount}`
        },
        {
            key: 'positionCount', label: 'Puestos', align: 'center',
            render: r => `${r.positionCount}`
        },
        {
            key: 'activo', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${r.activo ? 'success' : 'neutral'}">${r.activo ? 'ACTIVO' : 'INACTIVO'}</span>`
        },
    ];

    actions: TableAction<Department>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: row => this.openEditModal(row),
        },
        {
            label: 'Desactivar', icon: '🚫', class: 'btn-delete',
            show: row => row.activo,
            onClick: row => this.onDeactivate(row),
        },
        {
            label: 'Activar', icon: '✓', class: 'btn-view',
            show: row => !row.activo,
            onClick: row => this.onActivate(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly departmentForm = this.fb.group({
        codigo:      ['', [Validators.required, Validators.maxLength(20)]],
        nombre:      ['', [Validators.required, Validators.maxLength(100)]],
        descripcion: [''],
        parentId:    [null as number | null],
        managerId:   [null as number | null],
    });

    /** El código del departamento se referencia desde puestos y empleados → solo lectura al editar. */
    private static readonly CAMPOS_BLOQUEADOS = ['codigo'];

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        // Los selects de jefe y departamento padre del FORM cargan sus opciones bajo demanda (server-side).
        this.loadEmpleadosFiltro();
        this.loadDepartamentosFiltro();
        this.loadPage();
    }

    /** Empleados para el select de filtro "Jefe" del toolbar (lista acotada, no requiere server-search). */
    private loadEmpleadosFiltro(): void {
        this.employeeService.searchPage(0, PAGINATION.maxPageSize)
            .then(res => this.empleadosFiltro.set(res.content ?? []))
            .catch(() => this.empleadosFiltro.set([]));
    }

    /** Todos los departamentos para el select de filtro "Departamento padre" del toolbar. */
    private loadDepartamentosFiltro(): void {
        this.departmentService.fetchAll()
            .then(list => this.departamentosFiltro.set(list ?? []))
            .catch(() => this.departamentosFiltro.set([]));
    }

    /** Carga la página actual server-side (search + TODOS los filtros avanzados + 20/pág). */
    private loadPage(): void {
        this.departmentService.loadDepartmentsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            activo: this.filterActivo() || undefined,
            managerId: this.filterManagerId(),
            parentId: this.filterParentId(),
            createdAtDesde: this.filterCreatedAtDesde(),
            createdAtHasta: this.filterCreatedAtHasta(),
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar departamentos');
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
        switch (event.field) {
            case 'activo':    this.filterActivo.set(event.value != null ? String(event.value) : ''); break;
            case 'managerId': this.filterManagerId.set(event.value != null ? Number(event.value) : null); break;
            case 'parentId':  this.filterParentId.set(event.value != null ? Number(event.value) : null); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'createdAt') return;
        this.filterCreatedAtDesde.set(event.from ?? undefined);
        this.filterCreatedAtHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterActivo.set('');
        this.filterManagerId.set(null);
        this.filterParentId.set(null);
        this.filterCreatedAtDesde.set(undefined);
        this.filterCreatedAtHasta.set(undefined);
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
        this.selectedDept.set(null);
        this.departmentForm.reset();
        bloquearEnEdicion(this.departmentForm, DepartmentListComponent.CAMPOS_BLOQUEADOS, false);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(dept: Department): void {
        this.editMode.set(true);
        this.selectedDept.set(dept);
        this.departmentForm.patchValue({
            codigo:      dept.codigo,
            nombre:      dept.nombre,
            descripcion: dept.descripcion ?? '',
            parentId:    dept.parentId ?? null,
            managerId:   dept.managerId ?? null,
        });
        bloquearEnEdicion(this.departmentForm, DepartmentListComponent.CAMPOS_BLOQUEADOS, true);
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.departmentForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.departmentForm.invalid) {
            this.departmentForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            // getRawValue(): 'codigo' queda bloqueado en edición y no saldría en .value.
            const val = this.departmentForm.getRawValue();
            const request = {
                codigo: val.codigo!,
                nombre: val.nombre!,
                descripcion: val.descripcion ?? undefined,
                parentId: val.parentId ?? undefined,
                managerId: val.managerId ?? undefined,
            };
            if (this.editMode() && this.selectedDept()) {
                await this.departmentService.updateDepartment(this.selectedDept()!.id, request);
            } else {
                await this.departmentService.createDepartment(request);
            }
            this.closeModal();
            this.loadPage();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar departamento');
        } finally {
            this.submitting.set(false);
        }
    }

    async onDeactivate(dept: Department): Promise<void> {
        if (!confirm(`¿Desactivar el departamento "${dept.nombre}"?`)) return;
        try {
            await this.departmentService.deactivateDepartment(dept.id);
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al desactivar departamento');
        }
    }

    async onActivate(dept: Department): Promise<void> {
        if (!confirm(`¿Reactivar el departamento "${dept.nombre}"?`)) return;
        try {
            await this.departmentService.activateDepartment(dept.id);
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al reactivar departamento');
        }
    }

    getControl(name: string): FormControl {
        return this.departmentForm.get(name) as FormControl;
    }
}
