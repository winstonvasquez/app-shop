import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DepartmentService } from '../../services/department.service';
import { EmployeeService } from '../../services/employee.service';
import { Department } from '../../models/department.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

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
    readonly employees = this.employeeService.activeEmployees;

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

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly filtered = computed(() => {
        const term   = this.searchQuery().toLowerCase();
        const activo = this.filterActivo();
        return this.departments().filter(d => {
            const matchSearch = !term ||
                d.codigo.toLowerCase().includes(term) ||
                d.nombre.toLowerCase().includes(term);
            const matchActivo = activo === '' || String(d.activo) === activo;
            return matchSearch && matchActivo;
        });
    });

    readonly totalElements = computed(() => this.filtered().length);
    readonly totalPages    = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtered().slice(start, start + this.pageSize());
    });

    readonly parentOptions = computed(() =>
        this.departments().filter(d => {
            const sel = this.selectedDept();
            return d.activo && (!sel || d.id !== sel.id);
        })
    );

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
        Promise.all([
            this.departmentService.loadAllDepartments(),
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

    onFilterActivo(event: Event): void {
        this.filterActivo.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
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
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al desactivar departamento');
        }
    }

    getControl(name: string): FormControl {
        return this.departmentForm.get(name) as FormControl;
    }
}
