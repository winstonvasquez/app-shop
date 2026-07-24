import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { of } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService } from '../../services/department.service';
import { EmployeeService } from '../../services/employee.service';
import { Department } from '../../models/department.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { employeeSelectSource, departmentSelectSource } from '../../components/select-sources';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-department-list',
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

    // ── UI state ──────────────────────────────────────────────────────────────
    error            = signal<string | null>(null);
    showModal        = signal(false);
    editMode         = signal(false);
    submitting       = signal(false);
    submitError      = signal<string | null>(null);
    selectedDept     = signal<Department | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    searchQuery  = signal('');
    filterActivo = signal('');

    // ── Exportación server-side (XLSX/CSV) ──────────────────────────────────────
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/departments/export`,
        filename: 'departments',
        params: () => ({
            search: this.searchQuery(),
            activo: this.filterActivo(),
        }),
    };

    // Filtro de estado para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        { field: 'activo', label: 'Todos', options: of([
            { value: 'true', label: 'Activos' },
            { value: 'false', label: 'Inactivos' }
        ]) }
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
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly departmentForm = this.fb.group({
        codigo:      ['', [Validators.required, Validators.maxLength(20)]],
        nombre:      ['', [Validators.required, Validators.maxLength(100)]],
        descripcion: [''],
        parentId:    [null as number | null],
        managerId:   [null as number | null],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        // Los selects de jefe y departamento padre cargan sus opciones bajo demanda (server-side).
        this.loadPage();
    }

    /** Carga la página actual server-side (search + activo + 20/pág). */
    private loadPage(): void {
        this.departmentService.loadDepartmentsPaged(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery() || undefined,
            this.filterActivo() || undefined
        ).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar departamentos');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'activo') {
            this.filterActivo.set(event.value != null ? String(event.value) : '');
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
        this.editMode.set(false);
        this.selectedDept.set(null);
        this.departmentForm.reset();
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
            const val = this.departmentForm.value;
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

    getControl(name: string): FormControl {
        return this.departmentForm.get(name) as FormControl;
    }
}
