import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { KardexEntry, InventoryMovementType } from '../../models/inventory.models';
import { DataTableComponent, TableColumn, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-kardex-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent, PageHeaderComponent, AlertComponent, ButtonComponent
    ],
    templateUrl: './kardex-view.component.html'
})
export class KardexViewComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    entries = signal<KardexEntry[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    currentProductId = signal<number | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
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

    searchForm: FormGroup = this.fb.nonNullable.group({
        productId: [null as number | null, [Validators.required, Validators.min(1)]]
    });

    onSearch(): void {
        if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
        const id = Number(this.searchForm.getRawValue().productId);
        this.currentProductId.set(id);
        this.currentPage.set(0);
        this.loadKardex(id);
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

    exportCsv(): void {
        const bom = '\uFEFF';
        const headers = ['N° Mov.', 'Fecha', 'Tipo', 'Almacén', 'Cantidad', 'Costo Unit.', 'Costo Total', 'Saldo', 'Referencia', 'Realizado por'];
        const rows = this.entries().map(e => [
            e.movementNumber ?? e.movementId,
            new Date(e.movementDate).toLocaleDateString('es-PE'),
            e.movementType,
            e.warehouseName ?? '',
            e.quantity,
            e.unitCost ?? '',
            e.totalCost ?? '',
            e.balanceAfter,
            e.referenceNumber ?? '',
            e.performedBy ?? ''
        ]);
        const csv = bom + [headers, ...rows]
            .map(r => r.map(c => `"${String(c)}"`).join(','))
            .join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `kardex-producto-${this.currentProductId()}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }

    getCtrl(name: string): FormControl { return this.searchForm.get(name) as FormControl; }
}
