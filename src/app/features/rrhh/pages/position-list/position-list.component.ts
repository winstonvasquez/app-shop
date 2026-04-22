import {
    Component, OnInit, inject, signal, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PositionService } from '../../services/position.service';
import { DepartmentService } from '../../services/department.service';
import { Position } from '../../models/position.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

@Component({
    selector: 'app-position-list',
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
    ],
    templateUrl: './position-list.component.html',
})
export class PositionListComponent implements OnInit {
    private readonly positionService = inject(PositionService);
    private readonly departmentService = inject(DepartmentService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly loading     = this.positionService.loading;
    readonly positions   = this.positionService.positions;
    readonly departments = this.departmentService.activeDepartments;

    // ── UI state ──────────────────────────────────────────────────────────────
    error        = signal<string | null>(null);
    showModal    = signal(false);
    editMode     = signal(false);
    submitting   = signal(false);
    submitError  = signal<string | null>(null);
    selectedPos  = signal<Position | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    searchQuery      = signal('');
    filterDepartment = signal('');

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly filtered = computed(() => {
        const term   = this.searchQuery().toLowerCase();
        const deptId = this.filterDepartment();
        return this.positions().filter(p => {
            const matchSearch = !term ||
                p.codigo.toLowerCase().includes(term) ||
                p.nombre.toLowerCase().includes(term);
            const matchDept = !deptId || String(p.departmentId) === deptId;
            return matchSearch && matchDept;
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
        { label: 'Puestos' },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Position>[] = [
        {
            key: 'codigo', label: 'Código', sortable: true, width: '100px',
            html: true, render: r => `<span class="font-mono text-sm">${r.codigo}</span>`
        },
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'departmentName', label: 'Departamento', render: r => r.departmentName ?? '—' },
        { key: 'nivel', label: 'Nivel', render: r => r.nivel ?? '—' },
        {
            key: 'salarioMinimo', label: 'Rango Salarial', html: true,
            render: r => {
                if (!r.salarioMinimo && !r.salarioMaximo) return '<span style="color:var(--color-text-muted)">—</span>';
                const min = r.salarioMinimo ? `S/ ${r.salarioMinimo.toLocaleString('es-PE')}` : '—';
                const max = r.salarioMaximo ? `S/ ${r.salarioMaximo.toLocaleString('es-PE')}` : '—';
                return `<span class="font-mono text-sm">${min} – ${max}</span>`;
            }
        },
        {
            key: 'employeeCount', label: 'Empleados', align: 'center',
            render: r => `${r.employeeCount}`
        },
        {
            key: 'activo', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${r.activo ? 'success' : 'neutral'}">${r.activo ? 'ACTIVO' : 'INACTIVO'}</span>`
        },
    ];

    actions: TableAction<Position>[] = [
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
    readonly positionForm = this.fb.group({
        codigo:        ['', [Validators.required, Validators.maxLength(20)]],
        nombre:        ['', [Validators.required, Validators.maxLength(100)]],
        descripcion:   [''],
        departmentId:  [null as number | null, Validators.required],
        nivel:         [''],
        salarioMinimo: [null as number | null],
        salarioMaximo: [null as number | null],
        requisitos:    [''],
    });

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        Promise.all([
            this.positionService.loadAllPositions(),
            this.departmentService.loadDepartments(),
        ]).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar datos');
        });
    }

    // ── Handlers ─────────────────────────────────────────────────────────────
    onSearch(event: Event): void {
        this.searchQuery.set((event.target as HTMLInputElement).value);
        this.currentPage.set(0);
    }

    onFilterDepartment(event: Event): void {
        this.filterDepartment.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedPos.set(null);
        this.positionForm.reset();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    openEditModal(pos: Position): void {
        this.editMode.set(true);
        this.selectedPos.set(pos);
        this.positionForm.patchValue({
            codigo:        pos.codigo,
            nombre:        pos.nombre,
            descripcion:   pos.descripcion ?? '',
            departmentId:  pos.departmentId,
            nivel:         pos.nivel ?? '',
            salarioMinimo: pos.salarioMinimo ?? null,
            salarioMaximo: pos.salarioMaximo ?? null,
            requisitos:    pos.requisitos ?? '',
        });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.positionForm.reset();
    }

    async onSubmit(): Promise<void> {
        if (this.positionForm.invalid) {
            this.positionForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.positionForm.value;
            const request = {
                codigo: val.codigo!,
                nombre: val.nombre!,
                descripcion: val.descripcion ?? undefined,
                departmentId: val.departmentId!,
                nivel: val.nivel ?? undefined,
                salarioMinimo: val.salarioMinimo ?? undefined,
                salarioMaximo: val.salarioMaximo ?? undefined,
                requisitos: val.requisitos ?? undefined,
            };
            if (this.editMode() && this.selectedPos()) {
                await this.positionService.updatePosition(this.selectedPos()!.id, request);
            } else {
                await this.positionService.createPosition(request);
            }
            this.closeModal();
        } catch (err) {
            this.submitError.set((err as Error).message ?? 'Error al guardar puesto');
        } finally {
            this.submitting.set(false);
        }
    }

    async onDeactivate(pos: Position): Promise<void> {
        if (!confirm(`¿Desactivar el puesto "${pos.nombre}"?`)) return;
        try {
            await this.positionService.deactivatePosition(pos.id);
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al desactivar puesto');
        }
    }

    getControl(name: string): FormControl {
        return this.positionForm.get(name) as FormControl;
    }
}
