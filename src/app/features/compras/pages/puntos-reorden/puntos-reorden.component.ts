import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService, ProveedorFiltroOption } from '../../services/proveedor.service';
import { PuntoReorden } from '../../models/evaluacion.model';
import { proveedorSelectSource } from '../../components/select-sources';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent,
    PaginationEvent, DateRangeFilterConfig, DateRangeChangeEvent, SortEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';


@Component({
    selector: 'app-puntos-reorden',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, ServerSearchSelectComponent, DataTableComponent],
    templateUrl: './puntos-reorden.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuntosReordenComponent implements OnInit {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    // Data
    items = signal<PuntoReorden[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);

    // Drawers de edición inline (el data-table solo soporta botones de acción, no forms embebidos por fila)
    selectedItem = signal<PuntoReorden | null>(null);
    showStockDrawer = signal(false);
    showConfigDrawer = signal(false);

    /** Proveedores activos para el select de filtro (lista acotada, no requiere server-search). */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterProveedorId = signal('');
    /** Preseleccionado en 'true' para preservar el comportamiento previo (solo activos por defecto). */
    filterActivo = signal('true');
    filterSoloAlerta = signal(false);
    filterSituacionStock = signal('');
    filterUpdatedAtDesde = signal<string | null>(null);
    filterUpdatedAtHasta = signal<string | null>(null);

    // Pagination
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('productoNombre');
    sortDirection = signal<'asc' | 'desc'>('asc');

    filters: FilterConfig[] = [
        signalFilter('proveedorId', 'Todos los proveedores', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS, { value: 'true' }),
        // Derivado en backend comparando stockActual vs puntoReorden/stockMinimo (no es columna de catálogo).
        staticFilter('situacionStock', 'Situación de stock', [
            { value: 'CRITICO', label: 'Crítico' },
            { value: 'BAJO', label: 'Bajo' },
            { value: 'NORMAL', label: 'Normal' },
        ]),
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'updatedAt', label: 'Última actualización de stock' }
    ];

    columns: TableColumn<PuntoReorden>[] = [
        { key: 'sku', label: 'SKU' },
        { key: 'productoNombre', label: 'Producto', sortable: true },
        { key: 'proveedorNombre', label: 'Proveedor', render: (r) => r.proveedorNombre ?? '—' },
        { key: 'stockMinimo', label: 'Stock Mín.', align: 'center' },
        { key: 'puntoReorden', label: 'Punto Reorden', align: 'center' },
        {
            key: 'stockActual', label: 'Stock Actual', align: 'center', html: true,
            render: (r) => `<span class="font-bold ${r.requiereReorden ? 'text-error' : 'text-success'}">${r.stockActual}</span>`
        },
        { key: 'cantidadSugerida', label: 'Sugerido', align: 'center' },
        {
            key: 'requiereReorden', label: 'Estado', align: 'center', html: true,
            render: (r) => r.requiereReorden
                ? `<span class="badge badge-error">⚠ Reordenar</span>`
                : `<span class="badge badge-success">OK</span>`
        },
    ];

    actions: TableAction<PuntoReorden>[] = [
        { label: 'Actualizar stock', icon: '✏', class: 'btn-icon-edit', onClick: (row) => this.iniciarEditStock(row) },
        { label: 'Editar configuración', icon: '⚙', class: 'btn-icon-edit', onClick: (row) => this.iniciarEditConfig(row) },
        { label: 'Desactivar', icon: '🗑', class: 'btn-icon-delete', onClick: (row) => this.desactivar(row.id) },
    ];

    form: FormGroup = this.fb.group({
        productoId: ['', Validators.required],
        sku: ['', Validators.required],
        productoNombre: ['', Validators.required],
        proveedorId: [''],
        stockMinimo: [5, [Validators.required, Validators.min(0)]],
        puntoReorden: [10, [Validators.required, Validators.min(0)]],
        cantidadSugerida: [20, [Validators.required, Validators.min(1)]],
    });

    stockForm: FormGroup = this.fb.group({
        nuevoStock: [0, [Validators.required, Validators.min(0)]],
    });

    configForm: FormGroup = this.fb.group({
        stockMinimo: [0, [Validators.required, Validators.min(0)]],
        puntoReorden: [0, [Validators.required, Validators.min(0)]],
        cantidadSugerida: [0, [Validators.required, Validators.min(1)]],
    });

    ngOnInit(): void {
        this.cargar();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(res.content.map(p => ({ id: p.id!, razonSocial: p.razonSocial }))),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    cargar(): void {
        this.loading.set(true);
        this.service.listarPuntosReorden({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            activo: this.filterActivo() ? this.filterActivo() === 'true' : undefined,
            soloAlerta: this.filterSoloAlerta() || undefined,
            situacionStock: this.filterSituacionStock() || undefined,
            updatedAtDesde: this.filterUpdatedAtDesde() || undefined,
            updatedAtHasta: this.filterUpdatedAtHasta() || undefined,
            sortField: this.sortField() || undefined,
            sortDirection: this.sortDirection()
        }).subscribe({
            next: (res) => {
                this.items.set(res.content);
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
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'proveedorId':     this.filterProveedorId.set(valor); break;
            case 'activo':          this.filterActivo.set(valor); break;
            case 'situacionStock':  this.filterSituacionStock.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'updatedAt') {
            this.filterUpdatedAtDesde.set(event.from);
            this.filterUpdatedAtHasta.set(event.to);
            this.currentPage.set(0);
            this.cargar();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterProveedorId.set('');
        this.filterActivo.set('');
        this.filterSituacionStock.set('');
        this.filterUpdatedAtDesde.set(null);
        this.filterUpdatedAtHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.cargar();
    }

    onPaginationChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    iniciarEditStock(item: PuntoReorden): void {
        this.selectedItem.set(item);
        this.stockForm.setValue({ nuevoStock: item.stockActual });
        this.showStockDrawer.set(true);
    }

    guardarStock(): void {
        const item = this.selectedItem();
        if (!item || this.stockForm.invalid) return;
        this.service.actualizarStock(item.id, this.stockForm.value.nuevoStock).subscribe({
            next: () => {
                this.showStockDrawer.set(false);
                this.selectedItem.set(null);
                this.cargar();
            },
        });
    }

    iniciarEditConfig(item: PuntoReorden): void {
        this.selectedItem.set(item);
        this.configForm.setValue({
            stockMinimo: item.stockMinimo,
            puntoReorden: item.puntoReorden,
            cantidadSugerida: item.cantidadSugerida,
        });
        this.showConfigDrawer.set(true);
    }

    guardarConfig(): void {
        const item = this.selectedItem();
        if (!item || this.configForm.invalid) return;
        this.service.actualizarConfiguracion(item.id, this.configForm.value).subscribe({
            next: () => {
                this.showConfigDrawer.set(false);
                this.selectedItem.set(null);
                this.cargar();
            },
        });
    }

    desactivar(id: string): void {
        if (!confirm('¿Desactivar este punto de reorden?')) return;
        this.service.desactivarPuntoReorden(id).subscribe({
            next: () => this.cargar(),
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearPuntoReorden(v).subscribe({
            next: () => {
                this.form.reset({ stockMinimo: 5, puntoReorden: 10, cantidadSugerida: 20 });
                this.showForm.set(false);
                this.saving.set(false);
                this.currentPage.set(0);
                this.cargar();
            },
            error: () => this.saving.set(false),
        });
    }
}
