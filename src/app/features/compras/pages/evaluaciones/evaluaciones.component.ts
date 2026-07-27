import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { CatalogService } from '@core/services/catalog.service';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService, ProveedorFiltroOption } from '../../services/proveedor.service';
import { EvaluacionProveedor } from '../../models/evaluacion.model';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { proveedorSelectSource } from '../../components/select-sources';
import {
    DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent,
    PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent, SortEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';

/** Proveedor activo para el select de filtro del toolbar (lista acotada). */

@Component({
    selector: 'app-evaluaciones',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, ServerSearchSelectComponent, DataTableComponent],
    templateUrl: './evaluaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesComponent implements OnInit {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    // Data
    evaluaciones = signal<EvaluacionProveedor[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterProveedorId = signal('');
    filterNivel = signal('');
    /** YYYY-MM. No hay endpoint que liste periodos existentes, por eso es texto libre y no un select. */
    filterPeriodo = signal('');
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('createdAt');
    sortDirection = signal<'asc' | 'desc'>('desc');

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'NIVEL_PROVEEDOR', 'nivel', 'Todos los niveles'),
        signalFilter('proveedorId', 'Todos los proveedores', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
    ];

    /** Rango de fecha de evaluación para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de evaluación' }
    ];

    columns: TableColumn<EvaluacionProveedor>[] = [
        {
            key: 'fechaEvaluacion', label: 'Fecha',
            render: (r) => r.fechaEvaluacion ? new Date(r.fechaEvaluacion).toLocaleDateString('es-PE') : '—'
        },
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'ordenCompraCodigo', label: 'OC', render: (r) => r.ordenCompraCodigo ?? '—' },
        {
            key: 'puntajeEntrega', label: 'Entrega', align: 'center',
            html: true, render: (r) => `<span class="${this.puntajeColor(r.puntajeEntrega)}">${r.puntajeEntrega}</span>`
        },
        {
            key: 'puntajeCalidad', label: 'Calidad', align: 'center',
            html: true, render: (r) => `<span class="${this.puntajeColor(r.puntajeCalidad)}">${r.puntajeCalidad}</span>`
        },
        {
            key: 'puntajePrecio', label: 'Precio', align: 'center',
            html: true, render: (r) => `<span class="${this.puntajeColor(r.puntajePrecio)}">${r.puntajePrecio}</span>`
        },
        {
            key: 'puntajeServicio', label: 'Servicio', align: 'center',
            html: true, render: (r) => `<span class="${this.puntajeColor(r.puntajeServicio)}">${r.puntajeServicio}</span>`
        },
        {
            key: 'puntajeTotal', label: 'Total', align: 'center',
            html: true, render: (r) => `<span class="font-bold ${this.puntajeColor(r.puntajeTotal)}">${r.puntajeTotal.toFixed(1)}</span>`
        },
        {
            key: 'nivel', label: 'Nivel', align: 'center', html: true,
            render: (r) => `<span class="${this.nivelClass(r.nivel)}">${this.catalog.label('NIVEL_PROVEEDOR', r.nivel)}</span>`
        },
    ];

    form: FormGroup = this.fb.group({
        proveedorId: ['', Validators.required],
        puntajeEntrega: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajeCalidad: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajePrecio: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajeServicio: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        observaciones: [''],
    });

    ngOnInit(): void {
        this.loadEvaluaciones();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(res.content.map(p => ({ id: p.id!, razonSocial: p.razonSocial }))),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadEvaluaciones(): void {
        this.loading.set(true);
        this.service.listarEvaluaciones({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            nivel: this.filterNivel() || undefined,
            periodo: this.filterPeriodo() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() || undefined,
            createdAtHasta: this.filterCreatedAtHasta() || undefined,
            sortField: this.sortField() || undefined,
            sortDirection: this.sortDirection()
        }).subscribe({
            next: (res) => {
                this.evaluaciones.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadEvaluaciones();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'nivel':        this.filterNivel.set(valor); break;
            case 'proveedorId':  this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadEvaluaciones();
    }

    /** Filtro de periodo (YYYY-MM): control propio fuera del data-table (no hay endpoint que liste periodos). */
    onPeriodoChange(value: string): void {
        this.filterPeriodo.set(value);
        this.currentPage.set(0);
        this.loadEvaluaciones();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'createdAt') {
            this.filterCreatedAtDesde.set(event.from);
            this.filterCreatedAtHasta.set(event.to);
            this.currentPage.set(0);
            this.loadEvaluaciones();
        }
    }

    /** "Limpiar filtros": resetea todo (incluido periodo, que no vive en el data-table) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterProveedorId.set('');
        this.filterNivel.set('');
        this.filterPeriodo.set('');
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadEvaluaciones();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadEvaluaciones();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadEvaluaciones();
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearEvaluacion(v).subscribe({
            next: () => {
                this.form.reset({ puntajeEntrega: 80, puntajeCalidad: 80, puntajePrecio: 80, puntajeServicio: 80 });
                this.showForm.set(false);
                this.saving.set(false);
                this.currentPage.set(0);
                this.loadEvaluaciones();
            },
            error: () => this.saving.set(false),
        });
    }

    nivelClass(nivel: string): string {
        const map: Record<string, string> = {
            EXCELENTE: 'badge-success',
            BUENO: 'badge-accent',
            REGULAR: 'badge-warning',
            DEFICIENTE: 'badge-error',
        };
        return `badge ${map[nivel] ?? 'badge-neutral'}`;
    }

    puntajeColor(p: number): string {
        if (p >= 90) return 'text-success';
        if (p >= 75) return 'text-info';
        if (p >= 60) return 'text-warning';
        return 'text-error';
    }
}
