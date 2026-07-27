import {
    Component, OnInit, inject, signal,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluationService } from '../../services/evaluation.service';
import { EvaluationCriteria } from '../../models/evaluation.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { PAGINATION } from '@shared/constants/app.constants';

/**
 * CRUD simple de criterios de evaluación 360 (nombre, descripción, peso %,
 * puntaje mín/máx, activo). Listado paginado server-side vía
 * `GET /hr/api/evaluations/criteria/paged` (búsqueda + filtro de activo).
 */
@Component({
    selector: 'app-criteria-list',
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
    templateUrl: './criteria-list.component.html',
})
export class CriteriaListComponent implements OnInit {
    private readonly criteriaService = inject(EvaluationService);
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    readonly criteria = this.criteriaService.criteria;
    readonly loading = this.criteriaService.loading;

    // ── UI state ──────────────────────────────────────────────────────────────
    error       = signal<string | null>(null);
    showDrawer  = signal(false);
    editMode    = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);
    selected    = signal<EvaluationCriteria | null>(null);

    // ── Filters (server-side) ───────────────────────────────────────────────
    searchQuery  = signal('');
    filtroActivo = signal('');

    filters: FilterConfig[] = [
        staticFilter('activo', 'Todos', ACTIVO_OPTIONS),
    ];

    // ── Pagination (server-side) ────────────────────────────────────────────
    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    readonly totalElements = this.criteriaService.criteriaTotalElements;
    readonly totalPages    = this.criteriaService.criteriaTotalPages;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Evaluaciones', url: '/admin/rrhh/evaluations' },
        { label: 'Criterios' },
    ];

    columns: TableColumn<EvaluationCriteria>[] = [
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'descripcion', label: 'Descripción', render: r => r.descripcion || '—' },
        {
            key: 'pesoPorcentaje', label: 'Peso (%)', align: 'center',
            render: r => `${r.pesoPorcentaje}%`
        },
        { key: 'puntajeMinimo', label: 'Mín', align: 'center' },
        { key: 'puntajeMaximo', label: 'Máx', align: 'center' },
        {
            key: 'activo', label: 'Estado', html: true,
            render: r => `<span class="badge badge-${r.activo ? 'success' : 'neutral'}">${r.activo ? 'ACTIVO' : 'INACTIVO'}</span>`
        },
    ];

    actions: TableAction<EvaluationCriteria>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: row => this.openEdit(row),
        },
        {
            label: 'Desactivar', icon: '🚫', class: 'btn-delete',
            show: row => row.activo,
            onClick: row => this.onDeactivate(row),
        },
    ];

    readonly criteriaForm = this.fb.group({
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        descripcion: [''],
        pesoPorcentaje: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajeMinimo: [0, [Validators.min(0)]],
        puntajeMaximo: [100, [Validators.min(0)]],
    });

    ngOnInit(): void {
        this.loadPage();
    }

    /** Carga la página actual server-side (search + activo). */
    private loadPage(): void {
        this.criteriaService.loadCriteriaPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            activo: this.filtroActivo() || undefined,
        }).catch(() => { /* el servicio ya setea error() interno */ });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'activo') {
            this.filtroActivo.set(event.value != null ? String(event.value) : '');
            this.currentPage.set(0);
            this.loadPage();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filtroActivo.set('');
        this.currentPage.set(0);
        this.loadPage();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selected.set(null);
        this.criteriaForm.reset({ pesoPorcentaje: 0, puntajeMinimo: 0, puntajeMaximo: 100 });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(c: EvaluationCriteria): void {
        this.editMode.set(true);
        this.selected.set(c);
        this.criteriaForm.patchValue({
            nombre: c.nombre,
            descripcion: c.descripcion ?? '',
            pesoPorcentaje: c.pesoPorcentaje,
            puntajeMinimo: c.puntajeMinimo,
            puntajeMaximo: c.puntajeMaximo,
        });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.criteriaForm.reset();
    }

    async guardar(): Promise<void> {
        if (this.criteriaForm.invalid) {
            this.criteriaForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);
        try {
            const val = this.criteriaForm.value;
            const request = {
                nombre: val.nombre!,
                descripcion: val.descripcion || undefined,
                pesoPorcentaje: val.pesoPorcentaje!,
                puntajeMinimo: val.puntajeMinimo ?? undefined,
                puntajeMaximo: val.puntajeMaximo ?? undefined,
            };
            if (this.editMode() && this.selected()) {
                await this.criteriaService.updateCriteria(this.selected()!.id, request);
            } else {
                await this.criteriaService.createCriteria(request);
            }
            this.closeDrawer();
            this.loadPage();
        } catch (err: unknown) {
            this.submitError.set(err instanceof Error ? err.message : 'Error al guardar criterio');
        } finally {
            this.submitting.set(false);
        }
    }

    async onDeactivate(c: EvaluationCriteria): Promise<void> {
        if (!confirm(`¿Desactivar el criterio "${c.nombre}"?`)) return;
        try {
            await this.criteriaService.deactivateCriteria(c.id);
            this.loadPage();
        } catch (err: unknown) {
            this.error.set(err instanceof Error ? err.message : 'Error al desactivar criterio');
        }
    }

    getControl(name: string): FormControl {
        return this.criteriaForm.get(name) as FormControl;
    }
}
