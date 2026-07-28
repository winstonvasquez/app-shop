import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService, StockFiltros } from '../../services/inventory-api.service';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { InventoryStock, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ROUTES } from '@shared/constants/app.constants';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';

@Component({
    selector: 'app-stock-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, DrawerComponent, FormFieldComponent,
        PageHeaderComponent, AlertComponent, ButtonComponent
    ],
    templateUrl: './stock-view.component.html'
})
export class StockViewComponent {
    private readonly api = inject(InventoryApiService);
    private readonly productsApi = inject(ProductsApiService);
    private readonly fb = inject(FormBuilder);

    /** Mapa productId → nombre (el maestro de productos vive en ventas, cross-service). */
    private readonly productNames = signal<Map<number, string>>(new Map());

    warehouses = signal<Warehouse[]>([]);

    stock = signal<InventoryStock[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    // Filtros (TODOS server-side — la vista nunca filtra la página cargada)
    filterWarehouseId = signal<number | undefined>(undefined);
    filterEstadoStock = signal<string>('');
    filterUpdatedAtDesde = signal<string | null>(null);
    filterUpdatedAtHasta = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtros select del toolbar.
    // NOTA: sin filtro de Ubicación a propósito — ver comentario sobre `locationName`
    // en `columns` más abajo (el modelo de stock agregado no soporta una ubicación única).
    filters: FilterConfig[] = [
        signalFilter('warehouseId', 'Almacén', this.warehouses,
            w => ({ value: w.id, label: `${w.code} — ${w.name}` })),
        staticFilter('estadoStock', 'Estado de stock', [
            { value: 'BAJO_MINIMO', label: 'Bajo mínimo' },
            { value: 'REORDEN', label: 'Requiere reorden' },
            { value: 'NORMAL', label: 'Normal' }
        ])
    ];

    /** Rango de fecha de última actualización de stock para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'updatedAt', label: 'Última actualización' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Stock' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales, no solo el almacén). Ver
     * GET /inventory/api/inventory/stock/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/stock/export`,
        filename: 'stock',
        params: () => ({
            warehouseId: this.filterWarehouseId(),
            estadoStock: this.filterEstadoStock() || undefined,
            updatedAtDesde: this.filterUpdatedAtDesde() ?? undefined,
            updatedAtHasta: this.filterUpdatedAtHasta() ?? undefined
        }),
    };

    columns: TableColumn<InventoryStock>[] = [
        { key: 'productId',         label: 'Producto',     sortable: true,
          render: (r) => this.productNames().get(r.productId) ?? `Producto #${r.productId}` },
        { key: 'warehouseName',     label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
        // Sin columna "Ubicación": InventoryStockEntity es una fila AGREGADA por
        // (tenant, almacén, producto) — uk_stock_warehouse_product no incluye location_id,
        // y PutawaySuggestionService/locationsHoldingProduct asumen que un mismo producto
        // puede repartirse en VARIAS ubicaciones del mismo almacén. Mostrar aquí "la"
        // ubicación de esta fila sería forzar un dato falso (single-valued donde el
        // dominio es multi-valuado); ver notas del cambio para el detalle.
        { key: 'quantity',          label: 'Stock',        sortable: true, align: 'right',
          render: (r) => r.quantity.toLocaleString('es-PE') },
        { key: 'reservedQuantity',  label: 'Reservado',    align: 'right',
          render: (r) => (r.reservedQuantity ?? 0).toLocaleString('es-PE') },
        { key: 'availableQuantity', label: 'Disponible',   sortable: true, align: 'right',
          render: (r) => (r.availableQuantity ?? 0).toLocaleString('es-PE') },
        { key: 'minimumStock',      label: 'Mín.',         align: 'right',
          render: (r) => r.minimumStock != null ? r.minimumStock.toLocaleString('es-PE') : '—' },
        { key: 'averageCost',       label: 'Costo Prom.',  align: 'right',
          render: (r) => r.averageCost != null ? `S/ ${r.averageCost.toFixed(2)}` : '—' },
        {
            key: 'belowMinimum', label: 'Estado', html: true,
            render: (r) => r.belowMinimum
                ? '<span class="badge badge-error">Stock bajo</span>'
                : '<span class="badge badge-success">OK</span>'
        }
    ];

    actions: TableAction<InventoryStock>[] = [
        {
            label: 'Editar umbrales',
            icon: 'edit',
            class: 'btn-icon-edit',
            onClick: (row) => this.openThresholds(row)
        }
    ];

    // ── Drawer: editar umbrales (mín./máx./punto de reorden) ──────────
    showThresholdsDrawer = signal(false);
    selectedStock = signal<InventoryStock | null>(null);
    submittingThresholds = signal(false);
    thresholdsError = signal<string | null>(null);

    thresholdsForm = this.fb.nonNullable.group({
        minimumStock: [0, [Validators.required, Validators.min(0)]],
        maximumStock: [0, [Validators.required, Validators.min(0)]],
        reorderPoint: [0, [Validators.required, Validators.min(0)]]
    });

    constructor() {
        this.loadWarehouses();
        this.loadProductNames();
        this.loadStock();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (data) => this.warehouses.set(data),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    /** Resuelve nombres de producto en bulk; degrada graceful (queda "Producto #id"). */
    private loadProductNames(): void {
        this.productsApi.getProducts({ page: 0, size: 500 }).subscribe({
            next: (page) => {
                const map = new Map<number, string>();
                for (const p of page.content) { map.set(p.id, p.nombre); }
                this.productNames.set(map);
                // Si el stock ya estaba cargado, refrescar la referencia para re-render del nombre.
                if (this.stock().length > 0) { this.stock.set([...this.stock()]); }
            },
            error: () => this.productNames.set(new Map())
        });
    }

    /** Carga el stock del backend respetando TODOS los filtros actuales (búsqueda incluida). */
    loadStock(): void {
        this.loading.set(true);
        this.error.set(null);
        const filtros: StockFiltros = {
            page: this.currentPage(),
            size: this.pageSize(),
            warehouseId: this.filterWarehouseId(),
            estadoStock: this.filterEstadoStock() || undefined,
            updatedAtDesde: this.filterUpdatedAtDesde() ?? undefined,
            updatedAtHasta: this.filterUpdatedAtHasta() ?? undefined
        };
        this.api.getStockPaged(filtros).subscribe({
            next: (res) => {
                this.stock.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        switch (event.field) {
            case 'warehouseId': {
                const id = event.value != null ? Number(event.value) : undefined;
                this.filterWarehouseId.set(id);
                break;
            }
            case 'estadoStock':
                this.filterEstadoStock.set(event.value != null ? String(event.value) : '');
                break;
            default:
                return;
        }
        this.currentPage.set(0);
        this.loadStock();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'updatedAt') return;
        this.filterUpdatedAtDesde.set(event.from);
        this.filterUpdatedAtHasta.set(event.to);
        this.currentPage.set(0);
        this.loadStock();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.filterWarehouseId.set(undefined);
        this.filterEstadoStock.set('');
        this.filterUpdatedAtDesde.set(null);
        this.filterUpdatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadStock();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadStock();
    }

    openThresholds(row: InventoryStock): void {
        this.selectedStock.set(row);
        this.thresholdsError.set(null);
        this.thresholdsForm.reset({
            minimumStock: row.minimumStock ?? 0,
            maximumStock: row.maximumStock ?? 0,
            reorderPoint: row.reorderPoint ?? 0
        });
        this.showThresholdsDrawer.set(true);
    }

    closeThresholdsDrawer(): void {
        this.showThresholdsDrawer.set(false);
        this.selectedStock.set(null);
    }

    submitThresholds(): void {
        const stock = this.selectedStock();
        if (!stock || this.thresholdsForm.invalid) {
            this.thresholdsForm.markAllAsTouched();
            return;
        }
        this.submittingThresholds.set(true);
        this.thresholdsError.set(null);
        this.api.setStockThresholds(stock.warehouseId, stock.productId, this.thresholdsForm.getRawValue()).subscribe({
            next: () => {
                this.submittingThresholds.set(false);
                this.closeThresholdsDrawer();
                this.loadStock();
            },
            error: (err: Error) => {
                this.submittingThresholds.set(false);
                this.thresholdsError.set(err.message);
            }
        });
    }

    getThresholdsCtrl(name: string): FormControl {
        return this.thresholdsForm.get(name) as FormControl;
    }
}
