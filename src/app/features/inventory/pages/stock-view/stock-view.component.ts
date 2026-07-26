import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { ProductsApiService } from '@features/products/services/products-api.service';
import { InventoryStock, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ROUTES } from '@shared/constants/app.constants';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
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
    private readonly backendExportService = inject(BackendExportService);
    private readonly fb = inject(FormBuilder);

    /** Mapa productId → nombre (el maestro de productos vive en ventas, cross-service). */
    private readonly productNames = signal<Map<number, string>>(new Map());

    warehouses = signal<Warehouse[]>([]);
    allStock = signal<InventoryStock[]>([]);
    stock = signal<InventoryStock[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    showLowStockOnly = signal(false);
    selectedWarehouseId = signal<number | null>(null);
    searchQuery = signal('');

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    /** Página visible (slicing local: el stock llega completo por almacén). */
    readonly pagedStock = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.stock().slice(start, start + this.pageSize());
    });

    // Selector de almacén en el toolbar — opciones dinámicas desde la BD
    almacenFilters: FilterConfig[] = [
        {
            field: 'warehouse',
            label: 'Seleccionar almacén...',
            options: toObservable(this.warehouses).pipe(
                map(list => list.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` })))
            )
        }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Stock' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta el mismo filtro de almacén que la lista). Ver
     * GET /inventory/api/inventory/stock/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.inventory}/api/inventory/stock/export`,
        filename: 'stock',
        params: () => ({ warehouseId: this.selectedWarehouseId() }),
    };

    columns: TableColumn<InventoryStock>[] = [
        { key: 'productId',         label: 'Producto',     sortable: true,
          render: (r) => this.productNames().get(r.productId) ?? `Producto #${r.productId}` },
        { key: 'warehouseName',     label: 'Almacén',
          render: (r) => r.warehouseName ?? String(r.warehouseId) },
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

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'warehouse') return;
        const id = event.value != null ? Number(event.value) : 0;
        this.selectedWarehouseId.set(id || null);
        this.currentPage.set(0);
        if (!id) { this.allStock.set([]); this.applyFilter(); return; }
        this.loadStock(id);
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.applyFilter();
    }

    loadStock(warehouseId: number): void {
        this.loading.set(true);
        this.api.getStockByWarehouse(warehouseId).subscribe({
            next: (data) => {
                this.allStock.set(data);
                this.applyFilter();
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    toggleLowStock(): void {
        this.showLowStockOnly.set(!this.showLowStockOnly());
        this.applyFilter();
    }

    private applyFilter(): void {
        let filtered = this.showLowStockOnly()
            ? this.allStock().filter(s => s.belowMinimum)
            : this.allStock();
        const q = this.searchQuery().toLowerCase();
        if (q) {
            filtered = filtered.filter(s => {
                const nombre = this.productNames().get(s.productId)?.toLowerCase() ?? '';
                return nombre.includes(q) || String(s.productId).includes(q);
            });
        }
        this.stock.set(filtered);
        this.totalElements.set(filtered.length);
        this.totalPages.set(Math.ceil(filtered.length / this.pageSize()) || 1);
    }

    exportCsv(): void {
        // Exportacion SERVER-SIDE (mismo endpoint /export que exportConfig, formato csv).
        this.backendExportService.download(this.exportConfig, 'csv');
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
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
                if (this.selectedWarehouseId() != null) { this.loadStock(this.selectedWarehouseId()!); }
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
