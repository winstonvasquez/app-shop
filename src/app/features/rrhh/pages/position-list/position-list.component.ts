import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PositionService } from '../../services/position.service';
import { DepartmentService } from '../../services/department.service';
import { Position } from '../../models/position.model';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { departmentSelectSource } from '../../components/select-sources';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

@Component({
    selector: 'app-position-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        ServerSearchSelectComponent,
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
    // Se mantiene para el filtro de departamento del toolbar del data-table.
    readonly departments = this.departmentService.activeDepartments;
    /** Fuente server-side del search-select de departamento del formulario. */
    readonly departmentSource = departmentSelectSource(this.departmentService);

    // ── UI state ──────────────────────────────────────────────────────────────
    error        = signal<string | null>(null);
    showModal    = signal(false);
    editMode     = signal(false);
    submitting   = signal(false);
    submitError  = signal<string | null>(null);
    selectedPos  = signal<Position | null>(null);

    // ── Filters (TODOS server-side — la vista nunca filtra la página cargada) ──
    searchQuery      = signal('');
    filterDepartment = signal('');
    filterActivo     = signal('');
    // NOTA: 'nivel' es texto libre en la entidad (Position.nivel) y NO existe catálogo
    // NIVEL_PUESTO en erp_parameters (verificado: la ola de catálogos no lo seedeó porque
    // no hay una columna enum fija que respaldarlo) -> se omite el select para no ofrecer
    // opciones que no reflejen los valores reales guardados. El backend ya acepta ?nivel=
    // si en el futuro se decide poblarlo desde un endpoint de valores distintos.

    // Filtros select del toolbar: departamento (dinámico) + estado (booleano).
    departamentoFilters: FilterConfig[] = [
        {
            field: 'department',
            label: 'Departamento',
            options: toObservable(this.departments).pipe(
                map(list => list.map(d => ({ value: d.id, label: d.nombre })))
            )
        },
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /hr/api/positions/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.hr}/api/positions/export`,
        filename: 'puestos',
        params: () => ({
            search: this.searchQuery(),
            departmentId: this.filterDepartment(),
            activo: this.filterActivo(),
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
                const min = r.salarioMinimo ? `${CURRENCY_DISPLAY.SYMBOL_PEN} ${r.salarioMinimo.toLocaleString(CURRENCY_DISPLAY.LOCALE)}` : '—';
                const max = r.salarioMaximo ? `${CURRENCY_DISPLAY.SYMBOL_PEN} ${r.salarioMaximo.toLocaleString(CURRENCY_DISPLAY.LOCALE)}` : '—';
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
        {
            label: 'Activar', icon: '✓', class: 'btn-view',
            show: row => !row.activo,
            onClick: row => this.onActivate(row),
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

    /** El código del puesto se referencia desde contratos y empleados → solo lectura al editar. */
    private static readonly CAMPOS_BLOQUEADOS = ['codigo'];

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit(): void {
        this.departmentService.loadDepartments().catch(() => { /* dropdown depto opcional */ });
        this.loadPage();
    }

    /** Carga la página actual server-side (search + departamento + estado + 20/pág). */
    private loadPage(): void {
        this.positionService.loadPositionsPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            departmentId: this.filterDepartment() || undefined,
            activo: this.filterActivo() || undefined,
        }).then(res => {
            this.totalElements.set(res.totalElements);
            this.totalPages.set(res.totalPages);
        }).catch(err => {
            this.error.set((err as Error).message ?? 'Error al cargar puestos');
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
            case 'department': this.filterDepartment.set(event.value != null ? String(event.value) : ''); break;
            case 'activo':     this.filterActivo.set(event.value != null ? String(event.value) : ''); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterDepartment.set('');
        this.filterActivo.set('');
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
        this.selectedPos.set(null);
        this.positionForm.reset();
        bloquearEnEdicion(this.positionForm, PositionListComponent.CAMPOS_BLOQUEADOS, false);
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
        bloquearEnEdicion(this.positionForm, PositionListComponent.CAMPOS_BLOQUEADOS, true);
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
            // getRawValue(): 'codigo' queda bloqueado en edición y no saldría en .value.
            const val = this.positionForm.getRawValue();
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
            this.loadPage();
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
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al desactivar puesto');
        }
    }

    async onActivate(pos: Position): Promise<void> {
        if (!confirm(`¿Reactivar el puesto "${pos.nombre}"?`)) return;
        try {
            await this.positionService.activatePosition(pos.id);
            this.loadPage();
        } catch (err) {
            this.error.set((err as Error).message ?? 'Error al reactivar puesto');
        }
    }

    getControl(name: string): FormControl {
        return this.positionForm.get(name) as FormControl;
    }
}
