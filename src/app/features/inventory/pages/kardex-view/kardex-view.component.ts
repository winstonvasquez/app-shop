import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { InventoryApiService, KardexFiltros } from '../../services/inventory-api.service';
import { KardexEntry, Warehouse } from '../../models/inventory.models';
import { CatalogService } from '@core/services/catalog.service';
import { DataTableComponent, TableColumn, PaginationEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { ROUTES } from '@shared/constants/app.constants';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-kardex-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DataTableComponent, PageHeaderComponent, AlertComponent,
        ProductLookupComponent
    ],
    templateUrl: './kardex-view.component.html'
})
export class KardexViewComponent {
    private readonly api = inject(InventoryApiService);
    private readonly catalog = inject(CatalogService);

    entries = signal<KardexEntry[]>([]);
    warehouses = signal<Warehouse[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterWarehouseId = signal<number | undefined>(undefined);
    filterMovementType = signal<string>('');
    filterReferenceType = signal<string>('');
    filterMovementDateDesde = signal<string | undefined>(undefined);
    filterMovementDateHasta = signal<string | undefined>(undefined);
    searchQuery = signal('');

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Kardex Valorizado' }
    ];

    // Filtros select del toolbar: almacén dinámico (BD), tipo de movimiento y tipo de referencia.
    readonly filters: FilterConfig[] = [
        { field: 'warehouseId', label: 'Almacén', options: toObservable(this.warehouses).pipe(
            map(list => list.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }))) ) },
        { field: 'movementType', label: 'Tipo',
          options: toObservable(this.catalog.options('TIPO_MOVIMIENTO_INVENTARIO'))
            .pipe(map(o => o.map(x => ({ value: x.codigo, label: x.valor })))) },
        { field: 'referenceType', label: 'Referencia',
          options: toObservable(this.catalog.options('TIPO_REFERENCIA_MOVIMIENTO'))
            .pipe(map(o => o.map(x => ({ value: x.codigo, label: x.valor })))) }
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'movementDate', label: 'Fecha de movimiento' }
    ];

    columns: TableColumn<KardexEntry>[] = [
        { key: 'movementNumber', label: 'N° Mov.', width: '130px',
          render: (r) => r.movementNumber ?? String(r.movementId) },
        { key: 'movementDate', label: 'Fecha', sortable: true,
          render: (r) => new Date(r.movementDate).toLocaleDateString('es-PE') },
        {
            key: 'movementType', label: 'Tipo', html: true,
            render: (r) => {
                const isEntry = (r.movementType as string).startsWith('ENTRADA');
                return `<span class="badge ${isEntry ? 'badge-success' : 'badge-error'}">${r.movementType}</span>`;
            }
        },
        { key: 'warehouseName', label: 'Almacén',
          render: (r) => r.warehouseName ?? '—' },
        { key: 'quantity', label: 'Cant.', align: 'right', sortable: true,
          render: (r) => r.quantity.toLocaleString('es-PE') },
        { key: 'unitCost', label: 'Costo Unit.', align: 'right',
          render: (r) => r.unitCost != null ? `S/ ${r.unitCost.toFixed(2)}` : '—' },
        { key: 'totalCost', label: 'Costo Total', align: 'right',
          render: (r) => r.totalCost != null ? `S/ ${r.totalCost.toFixed(2)}` : '—' },
        { key: 'balanceAfter', label: 'Saldo', align: 'right', sortable: true,
          render: (r) => r.balanceAfter.toLocaleString('es-PE') },
        { key: 'referenceNumber', label: 'Referencia',
          render: (r) => r.referenceNumber ?? '—' },
        { key: 'performedBy', label: 'Realizado por',
          render: (r) => r.performedBy ?? '—' }
    ];

    constructor() {
        this.loadWarehouses();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({ next: (d) => this.warehouses.set(d) });
    }

    /** El usuario eligió un producto del buscador → carga su kardex. */
    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.currentPage.set(0);
        this.loadKardex();
    }

    /** Carga el kardex del backend respetando TODOS los filtros actuales (búsqueda incluida). */
    loadKardex(): void {
        const productId = this.currentProductId();
        if (!productId) return;
        this.loading.set(true);
        this.error.set(null);
        const filtros: KardexFiltros = {
            page: this.currentPage(),
            size: this.pageSize(),
            warehouseId: this.filterWarehouseId(),
            movementType: this.filterMovementType() || undefined,
            referenceType: this.filterReferenceType() || undefined,
            movementDateDesde: this.filterMovementDateDesde(),
            movementDateHasta: this.filterMovementDateHasta(),
            q: this.searchQuery() || undefined
        };
        this.api.getKardexByProduct(productId, filtros).subscribe({
            next: (res) => {
                this.entries.set(res.content ?? []);
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
        this.loadKardex();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        switch (event.field) {
            case 'warehouseId':
                this.filterWarehouseId.set(event.value != null ? Number(event.value) : undefined);
                break;
            case 'movementType':
                this.filterMovementType.set(event.value != null ? String(event.value) : '');
                break;
            case 'referenceType':
                this.filterReferenceType.set(event.value != null ? String(event.value) : '');
                break;
            default:
                return;
        }
        this.currentPage.set(0);
        this.loadKardex();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'movementDate') return;
        this.filterMovementDateDesde.set(event.from ?? undefined);
        this.filterMovementDateHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.loadKardex();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterWarehouseId.set(undefined);
        this.filterMovementType.set('');
        this.filterReferenceType.set('');
        this.filterMovementDateDesde.set(undefined);
        this.filterMovementDateHasta.set(undefined);
        this.currentPage.set(0);
        this.loadKardex();
    }

    /**
     * Exportacion SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (mismos filtros que la lista). Ver /inventory/api/kardex/product/{id}/export.
     * Getter (no readonly) porque la URL y los params dependen del producto/filtros en runtime.
     */
    get exportConfig(): BackendExportConfig {
        const productId = this.currentProductId();
        return {
            url: `${environment.apiUrls.inventory}/api/kardex/product/${productId}/export`,
            filename: `kardex-producto-${productId}`,
            params: () => ({
                warehouseId: this.filterWarehouseId(),
                movementType: this.filterMovementType() || undefined,
                referenceType: this.filterReferenceType() || undefined,
                movementDateDesde: this.filterMovementDateDesde(),
                movementDateHasta: this.filterMovementDateHasta(),
                q: this.searchQuery() || undefined
            })
        };
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadKardex();
    }
}
