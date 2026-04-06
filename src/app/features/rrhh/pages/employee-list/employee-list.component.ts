import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { Router } from '@angular/router';

@Component({
    selector: 'app-employee-list',
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
    templateUrl: './employee-list.component.html',
})
export class EmployeeListComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);

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

    // ── Filters ───────────────────────────────────────────────────────────────
    searchQuery  = signal('');
    filterEstado = signal('');

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly filtered = computed(() => {
        const term   = this.searchQuery().toLowerCase();
        const estado = this.filterEstado();
        return this.employees().filter(e => {
            const matchSearch = !term ||
                e.codigoEmpleado.toLowerCase().includes(term) ||
                e.nombres.toLowerCase().includes(term) ||
                e.apellidos.toLowerCase().includes(term) ||
                e.documentoIdentidad.includes(term);
            const matchEstado = !estado || e.estado === estado;
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
            render: r => `<span class="badge badge-${this.badgeEstado(r.estado)}">${r.estado}</span>`
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
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.employeeService.loadEmployees().catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar empleados');
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
            if (this.editMode() && this.selectedEmployee()) {
                await this.employeeService.updateEmployee(this.selectedEmployee()!.id, val as never);
            } else {
                await this.employeeService.createEmployee(val as never);
            }
            this.closeModal();
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
