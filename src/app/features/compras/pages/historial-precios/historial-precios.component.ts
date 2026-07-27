import { Component, ChangeDetectionStrategy, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService } from '@core/services/catalog.service';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService, ProveedorFiltroOption } from '../../services/proveedor.service';
import { HistorialPrecio } from '../../models/evaluacion.model';
import { MONEDA } from '@shared/constants/sunat.constants';
import { proveedorSelectSource } from '../../components/select-sources';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import {
    DataTableComponent, TableColumn, FilterConfig, FilterChangeEvent,
    PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent, SortEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';


@Component({
    selector: 'app-historial-precios',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, CatalogSelectComponent,
        ServerSearchSelectComponent, DataTableComponent],
    templateUrl: './historial-precios.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialPreciosComponent implements OnInit {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    // Data
    historial = signal<HistorialPrecio[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterProveedorId = signal('');
    filterMoneda = signal('');
    filterFechaReferenciaDesde = signal<string | null>(null);
    filterFechaReferenciaHasta = signal<string | null>(null);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('fechaReferencia');
    sortDirection = signal<'asc' | 'desc'>('desc');

    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('proveedorId', 'Todos los proveedores', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaReferencia', label: 'Fecha de referencia' }
    ];

    columns: TableColumn<HistorialPrecio>[] = [
        {
            key: 'fechaReferencia', label: 'Fecha',
            render: (r) => r.fechaReferencia ? new Date(r.fechaReferencia).toLocaleDateString('es-PE') : '—'
        },
        { key: 'sku', label: 'SKU' },
        { key: 'productoNombre', label: 'Producto' },
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'ordenCompraCodigo', label: 'OC', render: (r) => r.ordenCompraCodigo ?? '—' },
        {
            key: 'precioUnitario', label: 'Precio Unit.', align: 'right',
            render: (r) => (r.precioUnitario ?? 0).toFixed(2)
        },
        {
            key: 'moneda', label: 'Moneda', align: 'center', html: true,
            render: (r) => `<span class="badge badge-neutral">${r.moneda}</span>`
        },
    ];

    form: FormGroup = this.fb.group({
        productoId: ['', Validators.required],
        sku: ['', Validators.required],
        productoNombre: ['', Validators.required],
        proveedorId: ['', Validators.required],
        precioUnitario: [null, [Validators.required, Validators.min(0.01)]],
        moneda: [MONEDA.PEN],
        fechaReferencia: [''],
    });

    ngOnInit(): void {
        this.loadHistorial();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(res.content.map(p => ({ id: p.id!, razonSocial: p.razonSocial }))),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    loadHistorial(): void {
        this.loading.set(true);
        this.service.listarHistorialPrecios({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            moneda: this.filterMoneda() || undefined,
            fechaReferenciaDesde: this.filterFechaReferenciaDesde() || undefined,
            fechaReferenciaHasta: this.filterFechaReferenciaHasta() || undefined,
            sortField: this.sortField() || undefined,
            sortDirection: this.sortDirection()
        }).subscribe({
            next: (res) => {
                this.historial.set(res.content);
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
        this.loadHistorial();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'moneda':       this.filterMoneda.set(valor); break;
            case 'proveedorId':  this.filterProveedorId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadHistorial();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaReferencia') {
            this.filterFechaReferenciaDesde.set(event.from);
            this.filterFechaReferenciaHasta.set(event.to);
            this.currentPage.set(0);
            this.loadHistorial();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterProveedorId.set('');
        this.filterMoneda.set('');
        this.filterFechaReferenciaDesde.set(null);
        this.filterFechaReferenciaHasta.set(null);
        this.currentPage.set(0);
        this.loadHistorial();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadHistorial();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadHistorial();
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        if (!v.fechaReferencia) delete v.fechaReferencia;
        this.service.registrarPrecio(v).subscribe({
            next: () => {
                this.form.reset({ moneda: MONEDA.PEN });
                this.showForm.set(false);
                this.saving.set(false);
                this.currentPage.set(0);
                this.loadHistorial();
            },
            error: () => this.saving.set(false),
        });
    }
}
