import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryTransfer, InventoryTransferItem, Warehouse } from '../../models/inventory.models';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import type { ProductResponse } from '@core/models/product.model';

@Component({
    selector: 'app-transfer-management',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ProductLookupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Transferencias</h1>
                <p class="text-sm text-subtle">Gestiona transferencias entre almacenes.</p>
            </header>

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
                <app-product-lookup (selected)="onProductSelected($event)" placeholder="Buscar producto para detalle" />

                <div class="grid gap-4 md:grid-cols-4">
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Estado</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onSelectChange($event, 'status')">
                            <option value="">Todos</option>
                            @for (status of statusOptions; track status) {
                                <option [value]="status">{{ status }}</option>
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Almacén</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onSelectChange($event, 'warehouseId')">
                            <option value="">Todos</option>
                            @for (warehouse of warehouses(); track warehouse.id) {
                                <option [value]="warehouse.id">{{ warehouse.name }}</option>
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Desde</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="date" (change)="onInputChange($event, 'dateFrom')">
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Hasta</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="date" (change)="onInputChange($event, 'dateTo')">
                    </div>
                </div>
                @if (filterWarning()) {
                    <div class="rounded-lg border border-amber-200 bg-warning/10 px-3 py-2 text-xs text-amber-700">
                        {{ filterWarning() }}
                    </div>
                }
                @if (activeFilters().length) {
                    <div class="flex flex-wrap gap-2">
                        @for (filter of activeFilters(); track filter.key) {
                            <button class="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted" type="button" (click)="clearFilter(filter.key)">
                                {{ filter.label }}
                                <span class="text-gray-400">✕</span>
                            </button>
                        }
                        <button class="text-[11px] text-gray-400 underline" type="button" (click)="clearAllFilters()">Limpiar todo</button>
                    </div>
                }

                <form class="grid gap-4 md:grid-cols-2" [formGroup]="transferForm" (ngSubmit)="onCreateTransfer()">
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Almacén origen</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="sourceWarehouseId">
                            <option value="">Selecciona</option>
                            @for (warehouse of warehouses(); track warehouse.id) {
                                <option [value]="warehouse.id">{{ warehouse.name }}</option>
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Almacén destino</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="destinationWarehouseId">
                            <option value="">Selecciona</option>
                            @for (warehouse of warehouses(); track warehouse.id) {
                                <option [value]="warehouse.id">{{ warehouse.name }}</option>
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Fecha de solicitud</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="datetime-local" formControlName="requestDate">
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Notas</label>
                        <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="notes" placeholder="Observaciones">
                    </div>

                    <div class="md:col-span-2">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-on">Items</h3>
                            <button type="button" class="text-xs text-primary" (click)="addItem()">+ Agregar item</button>
                        </div>
                        <div class="mt-3 space-y-3">
                            @for (item of items(); track $index) {
                                <div class="grid gap-3 rounded-lg border border-border-subtle p-3 md:grid-cols-5">
                                    <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Producto ID" [value]="item.productId" (input)="onItemInput($event, $index, 'productId')">
                                    <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Cantidad" [value]="item.requestedQuantity" (input)="onItemInput($event, $index, 'requestedQuantity')">
                                    <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Lote ID" [value]="item.lotId || ''" (input)="onItemInput($event, $index, 'lotId')">
                                    <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Serie ID" [value]="item.serialNumberId || ''" (input)="onItemInput($event, $index, 'serialNumberId')">
                                    <input class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Notas" [value]="item.notes || ''" (input)="onItemInput($event, $index, 'notes')">
                                </div>
                            }
                        </div>
                    </div>

                    <div class="md:col-span-2 flex justify-end">
                        <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="transferForm.invalid || items().length === 0 || submitting()">
                            {{ submitting() ? 'Creando...' : 'Crear transferencia' }}
                        </button>
                    </div>
                </form>
            </div>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Transferencias recientes</h2>
                    <span class="text-xs text-subtle">{{ transfers().length }} registros</span>
                </div>
                <div class="mt-3 flex justify-end">
                    <button class="rounded-full border border-border px-3 py-1 text-xs" type="button" (click)="exportTransfers()">Exportar CSV</button>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Número</th>
                                <th class="py-2">Origen</th>
                                <th class="py-2">Destino</th>
                                <th class="py-2">Estado</th>
                                <th class="py-2">Fecha</th>
                                <th class="py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (transfer of transfers(); track transfer.id) {
                                <tr>
                                    <td class="py-3 text-on">{{ transfer.transferNumber || transfer.id }}</td>
                                    <td class="py-3 text-muted">{{ transfer.sourceWarehouseName }}</td>
                                    <td class="py-3 text-muted">{{ transfer.destinationWarehouseName }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-[11px] font-semibold" [class]="getStatusClass(transfer.status)">
                                            {{ transfer.status }}
                                        </span>
                                    </td>
                                    <td class="py-3 text-subtle">{{ transfer.requestDate | date:'short' }}</td>
                                    <td class="py-3 space-x-2">
                                        <button class="rounded-full border border-border px-3 py-1 text-xs" (click)="sendTransfer(transfer.id)" [disabled]="transfer.status !== 'PENDIENTE'">Enviar</button>
                                        <button class="rounded-full border border-border px-3 py-1 text-xs" (click)="receiveTransfer(transfer.id)" [disabled]="transfer.status !== 'ENVIADA'">Recibir</button>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-subtle">
                    <span>Página {{ transferPage() + 1 }} de {{ transferTotalPages() }}</span>
                    <div class="flex gap-2">
                        <button class="rounded-full border border-border px-3 py-1" (click)="changeTransferPage(transferPage() - 1)" [disabled]="transferPage() === 0">Anterior</button>
                        <button class="rounded-full border border-border px-3 py-1" (click)="changeTransferPage(transferPage() + 1)" [disabled]="transferPage() + 1 >= transferTotalPages()">Siguiente</button>
                    </div>
                </div>
            </div>
        </section>
    `
})
export class TransferManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    transfers = signal<InventoryTransfer[]>([]);
    items = signal<InventoryTransferItem[]>([{ productId: 0, requestedQuantity: 1 }]);
    transferPage = signal(0);
    transferTotalPages = signal(1);
    transferPageSize = signal(10);
    submitting = signal(false);
    error = signal<string | null>(null);
    statusOptions: InventoryTransfer['status'][] = ['PENDIENTE', 'ENVIADA', 'RECIBIDA', 'CANCELADA'];
    filterWarning = signal<string | null>(null);
    filters = signal({
        status: '',
        warehouseId: 0,
        dateFrom: '',
        dateTo: ''
    });

    activeFilters(): Array<{ key: 'status' | 'warehouseId' | 'dateFrom' | 'dateTo'; label: string }> {
        const { status, warehouseId, dateFrom, dateTo } = this.filters();
        return [
            status ? { key: 'status', label: `Estado: ${status}` } : null,
            warehouseId ? { key: 'warehouseId', label: `Almacén: ${this.getWarehouseName(warehouseId)}` } : null,
            dateFrom ? { key: 'dateFrom', label: `Desde: ${dateFrom}` } : null,
            dateTo ? { key: 'dateTo', label: `Hasta: ${dateTo}` } : null
        ].filter((value): value is { key: 'status' | 'warehouseId' | 'dateFrom' | 'dateTo'; label: string } => Boolean(value));
    }

    transferForm = this.fb.nonNullable.group({
        sourceWarehouseId: [0, [Validators.required, Validators.min(1)]],
        destinationWarehouseId: [0, [Validators.required, Validators.min(1)]],
        requestDate: ['', [Validators.required]],
        notes: ['']
    });

    constructor() {
        this.loadWarehouses();
        this.loadTransfers();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (response) => this.warehouses.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    loadTransfers(): void {
        this.api.getTransfers({
            page: this.transferPage(),
            size: this.transferPageSize(),
            status: this.filters().status || undefined,
            warehouseId: this.filters().warehouseId || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (response) => {
                this.transfers.set(response.content);
                this.transferTotalPages.set(response.page.totalPages || 1);
            },
            error: (err: Error) => this.error.set(err.message)
        });
    }

    changeTransferPage(page: number): void {
        if (page < 0 || page >= this.transferTotalPages()) {
            return;
        }
        this.transferPage.set(page);
        this.loadTransfers();
    }

    onFilterChange(key: 'status' | 'warehouseId' | 'dateFrom' | 'dateTo', value: string): void {
        const parsedValue = key === 'warehouseId' ? Number(value) : value;
        this.filters.update(current => ({ ...current, [key]: parsedValue }));
        if (this.hasInvalidDateRange()) {
            this.filterWarning.set('El rango de fechas no es válido.');
            return;
        }
        this.filterWarning.set(null);
        this.transferPage.set(0);
        this.loadTransfers();
    }

    clearFilter(key: 'status' | 'warehouseId' | 'dateFrom' | 'dateTo'): void {
        const resetValue = key === 'warehouseId' ? 0 : '';
        this.filters.update(current => ({ ...current, [key]: resetValue }));
        this.filterWarning.set(null);
        this.transferPage.set(0);
        this.loadTransfers();
    }

    clearAllFilters(): void {
        this.filters.set({ status: '', warehouseId: 0, dateFrom: '', dateTo: '' });
        this.filterWarning.set(null);
        this.transferPage.set(0);
        this.loadTransfers();
    }

    private hasInvalidDateRange(): boolean {
        const { dateFrom, dateTo } = this.filters();
        if (!dateFrom || !dateTo) {
            return false;
        }
        return new Date(dateFrom) > new Date(dateTo);
    }

    private getWarehouseName(warehouseId: number): string {
        return this.warehouses().find(warehouse => warehouse.id === warehouseId)?.name ?? `${warehouseId}`;
    }

    getStatusClass(status: InventoryTransfer['status']): string {
        const base = 'bg-surface-sunken text-muted';
        const map: Partial<Record<InventoryTransfer['status'], string>> = {
            PENDIENTE: 'bg-amber-100 text-amber-700',
            ENVIADA: 'bg-indigo-100 text-indigo-700',
            RECIBIDA: 'bg-emerald-100 text-emerald-700',
            CANCELADA: 'bg-rose-100 text-rose-700'
        };
        return map[status] ?? base;
    }

    exportTransfers(): void {
        this.api.exportInventoryReport({
            type: 'transfers',
            warehouseId: this.filters().warehouseId || undefined,
            status: this.filters().status || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (blob) => this.downloadBlob('transferencias-inventario.csv', blob),
            error: () => {
                const rows = this.transfers().map(transfer => ({
                    numero: transfer.transferNumber || transfer.id,
                    origen: transfer.sourceWarehouseName || '',
                    destino: transfer.destinationWarehouseName || '',
                    estado: transfer.status,
                    fecha: transfer.requestDate || ''
                }));
                this.downloadCsv('transferencias-inventario.csv', rows);
            }
        });
    }

    private downloadBlob(filename: string, blob: Blob): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    private downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>): void {
        if (!rows.length) {
            return;
        }
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(',')]
            .concat(
                rows.map(row =>
                    headers
                        .map(key => String(row[key] ?? '').replace(/"/g, '""'))
                        .map(value => `"${value}"`)
                        .join(',')
                )
            )
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    addItem(): void {
        this.items.update(current => [...current, { productId: 0, requestedQuantity: 1 }]);
    }

    updateItem(index: number, key: keyof InventoryTransferItem, value: string): void {
        const parsedValue = ['productId', 'requestedQuantity', 'lotId', 'serialNumberId'].includes(String(key)) ? Number(value) : value;
        this.items.update(current => current.map((item, idx) => idx === index ? { ...item, [key]: parsedValue } : item));
    }

    onSelectChange(event: Event, filterKey: 'status' | 'warehouseId'): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onFilterChange(filterKey, value);
    }

    onInputChange(event: Event, filterKey: 'dateFrom' | 'dateTo'): void {
        const value = (event.target as HTMLInputElement).value;
        this.onFilterChange(filterKey, value);
    }

    onItemInput(event: Event, index: number, key: keyof InventoryTransferItem): void {
        const value = (event.target as HTMLInputElement).value;
        this.updateItem(index, key, value);
    }

    onCreateTransfer(): void {
        if (this.transferForm.invalid || this.items().length === 0) {
            this.transferForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        const validDetails = this.items().filter(item => item.productId && item.requestedQuantity);
        if (validDetails.length === 0) {
            this.error.set('Debe incluir al menos un detalle válido');
            this.submitting.set(false);
            return;
        }

        const payload = {
            sourceWarehouseId: this.transferForm.value.sourceWarehouseId ?? 0,
            destinationWarehouseId: this.transferForm.value.destinationWarehouseId ?? 0,
            requestDate: this.transferForm.value.requestDate ?? new Date().toISOString(),
            notes: this.transferForm.value.notes ?? undefined,
            details: validDetails
        };

        this.api.createTransfer(payload).subscribe({
            next: () => {
                this.submitting.set(false);
                this.items.set([{ productId: 0, requestedQuantity: 1 }]);
                this.transferForm.reset({ sourceWarehouseId: 0, destinationWarehouseId: 0, requestDate: '', notes: '' });
                this.loadTransfers();
            },
            error: (err: Error) => {
                this.submitting.set(false);
                this.error.set(err.message);
            }
        });
    }

    sendTransfer(id: number): void {
        this.api.sendTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    receiveTransfer(id: number): void {
        this.api.receiveTransfer(id).subscribe({
            next: () => this.loadTransfers(),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onProductSelected(product: ProductResponse): void {
        this.items.update(current => {
            if (!current.length) return current;
            const lastIndex = current.length - 1;
            return current.map((item, idx) => idx === lastIndex ? { ...item, productId: product.id } : item);
        });
    }
}
