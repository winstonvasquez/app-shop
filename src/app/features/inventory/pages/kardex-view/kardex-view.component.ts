import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { InventoryApiService } from '../../services/inventory-api.service';
import { KardexEntry } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
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

    entries = signal<KardexEntry[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    currentProductId = signal<number | null>(null);
    currentProductName = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    /** Página visible (slicing local: el kardex del producto llega completo). */
    readonly pagedEntries = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.entries().slice(start, start + this.pageSize());
    });

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Kardex Valorizado' }
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

    /** El usuario eligió un producto del buscador → carga su kardex. */
    onProductSelected(p: ProductResponse): void {
        this.currentProductId.set(p.id);
        this.currentProductName.set(p.nombre);
        this.currentPage.set(0);
        this.loadKardex(p.id);
    }

    loadKardex(productId: number): void {
        this.loading.set(true);
        this.api.getKardexByProduct(productId).subscribe({
            next: (data) => {
                this.entries.set(data);
                this.totalElements.set(data.length);
                this.totalPages.set(Math.ceil(data.length / this.pageSize()) || 1);
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /**
     * Exportacion SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (mismo producto que la lista). Ver /inventory/api/kardex/product/{id}/export.
     * Getter (no readonly) porque la URL depende del producto elegido en runtime.
     */
    get exportConfig(): BackendExportConfig {
        const productId = this.currentProductId();
        return {
            url: `${environment.apiUrls.inventory}/api/kardex/product/${productId}/export`,
            filename: `kardex-producto-${productId}`
        };
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }
}
