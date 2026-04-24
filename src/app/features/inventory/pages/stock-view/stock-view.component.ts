import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryStock, Warehouse } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-stock-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DataTableComponent, PageHeaderComponent, AlertComponent, ButtonComponent],
    templateUrl: './stock-view.component.html'
})
export class StockViewComponent {
    private readonly api = inject(InventoryApiService);

    warehouses = signal<Warehouse[]>([]);
    allStock = signal<InventoryStock[]>([]);
    stock = signal<InventoryStock[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    showLowStockOnly = signal(false);
    selectedWarehouseId = signal<number | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Stock' }
    ];

    columns: TableColumn<InventoryStock>[] = [
        { key: 'productId',         label: 'Producto ID',  sortable: true, width: '110px',
          render: (r) => `#${r.productId}` },
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

    constructor() { this.loadWarehouses(); }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (data) => this.warehouses.set(data),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onWarehouseChange(event: Event): void {
        const id = Number((event.target as HTMLSelectElement).value);
        this.selectedWarehouseId.set(id || null);
        if (!id) { this.allStock.set([]); this.applyFilter(); return; }
        this.loadStock(id);
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
        const filtered = this.showLowStockOnly()
            ? this.allStock().filter(s => s.belowMinimum)
            : this.allStock();
        this.stock.set(filtered);
        this.totalElements.set(filtered.length);
        this.totalPages.set(Math.ceil(filtered.length / this.pageSize()) || 1);
    }

    exportCsv(): void {
        const bom = '\uFEFF';
        const headers = ['Producto ID', 'Almacén', 'Stock', 'Reservado', 'Disponible', 'Mínimo', 'Bajo mínimo'];
        const rows = this.stock().map(s => [
            s.productId,
            s.warehouseName ?? s.warehouseId,
            s.quantity,
            s.reservedQuantity ?? 0,
            s.availableQuantity ?? 0,
            s.minimumStock ?? '',
            s.belowMinimum ? 'Sí' : 'No'
        ]);
        const csv = bom + [headers, ...rows]
            .map(r => r.map(c => `"${String(c)}"`).join(','))
            .join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `stock-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }
}
