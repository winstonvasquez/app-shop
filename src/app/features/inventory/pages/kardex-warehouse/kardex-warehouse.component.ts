import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WmsApiService } from '../../services/wms-api.service';
import { KardexLogisticoEntry } from '../../models/wms-zone.models';
import { AlmacenService } from '@features/logistica/services/almacen.service';
import { Almacen } from '@features/logistica/models/almacen.model';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { productIdToUuid } from '../../utils/synthetic-uuid.util';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-kardex-warehouse',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DataTableComponent, PageHeaderComponent, AlertComponent,
        ButtonComponent, ProductLookupComponent
    ],
    templateUrl: './kardex-warehouse.component.html'
})
export class KardexWarehouseComponent {
    private readonly api = inject(WmsApiService);
    private readonly almacenApi = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    readonly catalog = inject(CatalogService);

    entries = signal<KardexLogisticoEntry[]>([]);
    almacenesFiltro = signal<Almacen[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    selectedAlmacenId = signal<string | null>(null);
    filterTipoMovimiento = signal<string>('');
    filterProductoId = signal<string | undefined>(undefined);
    filterProductoNombre = signal<string | null>(null);
    filterFrom = signal<string | undefined>(undefined);
    filterTo = signal<string | undefined>(undefined);
    searchQuery = signal('');

    /** Panel del buscador de producto para el filtro del toolbar. */
    filterProductLookupOpen = signal(false);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Kardex por Almacén' }
    ];

    // Filtros select del toolbar. El almacén es OBLIGATORIO para poder consultar (path variable).
    filters: FilterConfig[] = [
        signalFilter('almacenId', 'Seleccionar almacén...', this.almacenesFiltro,
            a => ({ value: a.id, label: `${a.codigo} — ${a.nombre}` })),
        catalogFilter(this.catalog, 'TIPO_MOVIMIENTO_INVENTARIO', 'tipoMovimiento', 'Tipo')
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'periodo', label: 'Rango de fechas' }
    ];

    columns: TableColumn<KardexLogisticoEntry>[] = [
        { key: 'fecha', label: 'Fecha', sortable: true,
          render: (r) => new Date(r.fecha).toLocaleDateString('es-PE') },
        {
            key: 'tipoMovimiento', label: 'Tipo', html: true,
            render: (r) => {
                const isEntry = r.cantidadEntrada > 0;
                return `<span class="badge ${isEntry ? 'badge-success' : 'badge-error'}">${r.tipoMovimiento}</span>`;
            }
        },
        { key: 'productoNombre', label: 'Producto', render: (r) => r.productoNombre ?? r.sku },
        { key: 'cantidadEntrada', label: 'Entrada', align: 'right',
          render: (r) => r.cantidadEntrada > 0 ? r.cantidadEntrada.toLocaleString('es-PE') : '—' },
        { key: 'cantidadSalida', label: 'Salida', align: 'right',
          render: (r) => r.cantidadSalida > 0 ? r.cantidadSalida.toLocaleString('es-PE') : '—' },
        { key: 'saldo', label: 'Saldo', align: 'right', sortable: true,
          render: (r) => r.saldo.toLocaleString('es-PE') },
        { key: 'costoTotal', label: 'Costo Total', align: 'right',
          render: (r) => r.costoTotal != null ? `S/ ${r.costoTotal.toFixed(2)}` : '—' },
        { key: 'descripcion', label: 'Descripción', render: (r) => r.descripcion ?? '—' }
    ];

    constructor() {
        this.loadAlmacenes();
    }

    private loadAlmacenes(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (!companyId) { this.almacenesFiltro.set([]); return; }
        this.almacenApi.getAlmacenes(String(companyId), { page: 0, size: PAGINATION.maxPageSize }).subscribe({
            next: (res) => this.almacenesFiltro.set(res.content ?? []),
            error: () => this.almacenesFiltro.set([])
        });
    }

    /** Carga el kardex del backend respetando TODOS los filtros actuales. No hace nada sin almacén. */
    buscar(): void {
        const almacenId = this.selectedAlmacenId();
        if (!almacenId) { this.entries.set([]); this.totalElements.set(0); this.totalPages.set(0); return; }
        this.loading.set(true);
        this.error.set(null);
        this.api.getKardexPorAlmacen(almacenId, {
            page: this.currentPage(),
            size: this.pageSize(),
            from: this.filterFrom(),
            to: this.filterTo(),
            tipoMovimiento: this.filterTipoMovimiento() || undefined,
            productoId: this.filterProductoId(),
            q: this.searchQuery() || undefined
        }).subscribe({
            next: (res) => {
                this.entries.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.buscar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        switch (event.field) {
            case 'almacenId':
                this.selectedAlmacenId.set(event.value != null ? String(event.value) : null);
                break;
            case 'tipoMovimiento':
                this.filterTipoMovimiento.set(event.value != null ? String(event.value) : '');
                break;
            default:
                return;
        }
        this.currentPage.set(0);
        this.buscar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'periodo') return;
        this.filterFrom.set(event.from ?? undefined);
        this.filterTo.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.buscar();
    }

    /** "Limpiar filtros": resetea todo (incluye almacén, producto y búsqueda) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.selectedAlmacenId.set(null);
        this.filterTipoMovimiento.set('');
        this.filterProductoId.set(undefined);
        this.filterProductoNombre.set(null);
        this.filterFrom.set(undefined);
        this.filterTo.set(undefined);
        this.filterProductLookupOpen.set(false);
        this.currentPage.set(0);
        this.buscar();
    }

    /** Abre/cierra el mini-panel de búsqueda de producto para el filtro del toolbar. */
    toggleFilterProductLookup(): void {
        this.filterProductLookupOpen.set(!this.filterProductLookupOpen());
    }

    /** El maestro de productos es numérico (ventas); el kardex logístico usa el UUID sintético. */
    onFilterProductSelected(p: ProductResponse): void {
        this.filterProductoId.set(productIdToUuid(p.id));
        this.filterProductoNombre.set(p.nombre);
        this.filterProductLookupOpen.set(false);
        this.currentPage.set(0);
        this.buscar();
    }

    clearFilterProducto(): void {
        this.filterProductoId.set(undefined);
        this.filterProductoNombre.set(null);
        this.currentPage.set(0);
        this.buscar();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.buscar();
    }
}
