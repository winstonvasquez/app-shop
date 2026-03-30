import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryCount, InventoryCountDetailRequest, Warehouse } from '../../models/inventory.models';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import type { ProductResponse } from '@core/models/product.model';

@Component({
    selector: 'app-inventory-count',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, ProductLookupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Inventarios físicos</h1>
                <p class="text-sm text-subtle">Registra conteos y cierres de inventario.</p>
            </header>

            <app-product-lookup (selected)="onProductSelected($event)" placeholder="Buscar producto para detalle" />

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
                <div class="grid gap-4 md:grid-cols-4">
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
                        <label class="text-xs font-semibold uppercase text-subtle">Estado</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onStatusSelectChange($event)">
                            <option value="">Todos</option>
                            @for (status of statusOptions; track status) {
                                <option [value]="status">{{ status }}</option>
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
            </div>

            <form class="grid gap-4 rounded-xl border border-border-subtle bg-surface p-5 shadow-sm md:grid-cols-2" [formGroup]="countForm" (ngSubmit)="onSubmit()">
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Almacén</label>
                    <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="warehouseId">
                        <option value="">Selecciona un almacén</option>
                        @for (warehouse of warehouses(); track warehouse.id) {
                            <option [value]="warehouse.id">{{ warehouse.name }}</option>
                        }
                    </select>
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Fecha de conteo</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="datetime-local" formControlName="countDate">
                </div>
                <div class="md:col-span-2">
                    <label class="text-xs font-semibold uppercase text-subtle">Notas</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="notes" placeholder="Inventario mensual">
                </div>
                <div class="md:col-span-2">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-on">Detalles de conteo</h3>
                        <button type="button" class="text-xs text-primary" (click)="addDetail()">+ Agregar detalle</button>
                    </div>
                    <div class="mt-3 space-y-3">
                        @for (detail of details(); track $index) {
                            <div class="grid gap-3 rounded-lg border border-border-subtle p-3 md:grid-cols-6">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Producto ID" [value]="detail.productId" (input)="updateDetail($index, 'productId', $event.target.value)">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Cantidad contada" [value]="detail.countedQuantity" (input)="updateDetail($index, 'countedQuantity', $event.target.value)">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Ubicación ID" [value]="detail.locationId || ''" (input)="updateDetail($index, 'locationId', $event.target.value)">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Lote ID" [value]="detail.lotId || ''" (input)="updateDetail($index, 'lotId', $event.target.value)">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" type="number" placeholder="Serie ID" [value]="detail.serialNumberId || ''" (input)="updateDetail($index, 'serialNumberId', $event.target.value)">
                                <input class="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Notas" [value]="detail.notes || ''" (input)="updateDetail($index, 'notes', $event.target.value)">
                            </div>
                        }
                    </div>
                </div>
                <div class="md:col-span-2 flex justify-end">
                    <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="countForm.invalid || submitting()">
                        {{ submitting() ? 'Creando...' : 'Crear conteo' }}
                    </button>
                </div>
            </form>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Conteos registrados</h2>
                    <span class="text-xs text-subtle">{{ counts().length }} registros</span>
                </div>
                <div class="mt-3 flex justify-end">
                    <button class="rounded-full border border-border px-3 py-1 text-xs" type="button" (click)="exportCounts()">Exportar CSV</button>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Número</th>
                                <th class="py-2">Almacén</th>
                                <th class="py-2">Estado</th>
                                <th class="py-2">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (count of filteredCounts(); track count.id) {
                                <tr>
                                    <td class="py-3 text-on">{{ count.countNumber || count.id }}</td>
                                    <td class="py-3 text-muted">{{ count.warehouseName }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-[11px] font-semibold" [class]="getStatusClass(count.status)">
                                            {{ count.status }}
                                        </span>
                                    </td>
                                    <td class="py-3 text-subtle">{{ count.countDate || count.createdAt | date:'short' }}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-subtle">
                    <span>Página {{ countPage() + 1 }} de {{ countTotalPages() }}</span>
                    <div class="flex gap-2">
                        <button class="rounded-full border border-border px-3 py-1" (click)="changeCountPage(countPage() - 1)" [disabled]="countPage() === 0">Anterior</button>
                        <button class="rounded-full border border-border px-3 py-1" (click)="changeCountPage(countPage() + 1)" [disabled]="countPage() + 1 >= countTotalPages()">Siguiente</button>
                    </div>
                </div>
            </div>
        </section>
    `
})
export class InventoryCountComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    counts = signal<InventoryCount[]>([]);
    statusFilter = signal('');
    details = signal<InventoryCountDetailRequest[]>([{ productId: 0, countedQuantity: 0 }]);
    countPage = signal(0);
    countTotalPages = signal(1);
    countPageSize = signal(10);
    submitting = signal(false);
    error = signal<string | null>(null);
    filterWarning = signal<string | null>(null);
    filters = signal({
        warehouseId: 0,
        dateFrom: '',
        dateTo: ''
    });

    activeFilters(): Array<{ key: 'warehouseId' | 'dateFrom' | 'dateTo' | 'status'; label: string }> {
        const { warehouseId, dateFrom, dateTo } = this.filters();
        const status = this.statusFilter();
        return [
            status ? { key: 'status', label: `Estado: ${status}` } : null,
            warehouseId ? { key: 'warehouseId', label: `Almacén: ${this.getWarehouseName(warehouseId)}` } : null,
            dateFrom ? { key: 'dateFrom', label: `Desde: ${dateFrom}` } : null,
            dateTo ? { key: 'dateTo', label: `Hasta: ${dateTo}` } : null
        ].filter((value): value is { key: 'warehouseId' | 'dateFrom' | 'dateTo' | 'status'; label: string } => Boolean(value));
    }

    statusOptions: InventoryCount['status'][] = ['EN_PROCESO', 'CERRADO', 'AJUSTADO'];
    filteredCounts = computed(() => {
        const filter = this.statusFilter();
        return filter ? this.counts().filter(count => count.status === filter) : this.counts();
    });

    countForm = this.fb.nonNullable.group({
        warehouseId: [0, [Validators.required, Validators.min(1)]],
        countDate: ['', [Validators.required]],
        notes: ['']
    });

    constructor() {
        this.loadWarehouses();
        this.loadCounts();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (response) => this.warehouses.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    loadCounts(): void {
        this.api.getInventoryCounts({
            page: this.countPage(),
            size: this.countPageSize(),
            status: this.statusFilter() || undefined,
            warehouseId: this.filters().warehouseId || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (response) => {
                this.counts.set(response.content);
                this.countTotalPages.set(response.page.totalPages || 1);
            },
            error: (err: Error) => this.error.set(err.message)
        });
    }

    changeCountPage(page: number): void {
        if (page < 0 || page >= this.countTotalPages()) {
            return;
        }
        this.countPage.set(page);
        this.loadCounts();
    }

    onStatusFilter(status: string): void {
        this.filters.update(current => ({ ...current, status }));
        this.loadCounts();
    }

    onSelectChange(event: Event, filterKey: 'warehouseId'): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onFilterChange(filterKey, value);
    }

    onStatusSelectChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onStatusFilter(value);
    }

    onInputChange(event: Event, filterKey: 'dateFrom' | 'dateTo'): void {
        const value = (event.target as HTMLInputElement).value;
        this.onFilterChange(filterKey, value);
    }

    clearFilter(key: 'warehouseId' | 'dateFrom' | 'dateTo' | 'status'): void {
        if (key === 'status') {
            this.statusFilter.set('');
        } else {
            const resetValue = key === 'warehouseId' ? 0 : '';
            this.filters.update(current => ({ ...current, [key]: resetValue }));
        }
        this.filterWarning.set(null);
        this.countPage.set(0);
        this.loadCounts();
    }

    clearAllFilters(): void {
        this.filters.set({ warehouseId: 0, dateFrom: '', dateTo: '' });
        this.statusFilter.set('');
        this.filterWarning.set(null);
        this.countPage.set(0);
        this.loadCounts();
    }

    onFilterChange(key: 'warehouseId' | 'dateFrom' | 'dateTo', value: string): void {
        const parsedValue = key === 'warehouseId' ? Number(value) : value;
        this.filters.update(current => ({ ...current, [key]: parsedValue }));
        if (this.hasInvalidDateRange()) {
            this.filterWarning.set('El rango de fechas no es válido.');
            return;
        }
        this.filterWarning.set(null);
        this.countPage.set(0);
        this.loadCounts();
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

    getStatusClass(status: InventoryCount['status']): string {
        const base = 'bg-surface-sunken text-muted';
        const map: Partial<Record<InventoryCount['status'], string>> = {
            EN_PROCESO: 'bg-amber-100 text-amber-700',
            CERRADO: 'bg-indigo-100 text-indigo-700',
            AJUSTADO: 'bg-emerald-100 text-emerald-700'
        };
        return map[status] ?? base;
    }

    exportCounts(): void {
        this.api.exportInventoryReport({
            type: 'counts',
            warehouseId: this.filters().warehouseId || undefined,
            status: this.statusFilter() || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (blob) => this.downloadBlob('conteos-inventario.csv', blob),
            error: () => {
                const rows = this.filteredCounts().map(count => ({
                    numero: count.countNumber || count.id,
                    almacen: count.warehouseName || '',
                    estado: count.status,
                    fecha: count.countDate || count.createdAt
                }));
                this.downloadCsv('conteos-inventario.csv', rows);
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

    addDetail(): void {
        this.details.update(current => [...current, { productId: 0, countedQuantity: 0 }]);
    }

    updateDetail(index: number, key: keyof InventoryCountDetailRequest, value: string): void {
        const parsedValue = ['productId', 'countedQuantity', 'locationId', 'lotId', 'serialNumberId'].includes(String(key))
            ? Number(value)
            : value;
        this.details.update(current => current.map((detail, idx) => idx === index ? { ...detail, [key]: parsedValue } : detail));
    }

    onSubmit(): void {
        if (this.countForm.invalid) {
            this.countForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        const details = this.details().filter(detail => detail.productId && detail.countedQuantity !== undefined);
        if (details.length === 0) {
            this.error.set('Debe incluir al menos un detalle válido');
            this.submitting.set(false);
            return;
        }
        this.api.createInventoryCount({
            warehouseId: this.countForm.value.warehouseId ?? 0,
            countDate: this.countForm.value.countDate ?? new Date().toISOString(),
            notes: this.countForm.value.notes ?? undefined,
            details
        }).subscribe({
            next: () => {
                this.submitting.set(false);
                this.countForm.reset({ warehouseId: 0, countDate: '', notes: '' });
                this.details.set([{ productId: 0, countedQuantity: 0 }]);
                this.loadCounts();
            },
            error: (err: Error) => {
                this.submitting.set(false);
                this.error.set(err.message);
            }
        });
    }

    onProductSelected(product: ProductResponse): void {
        this.details.update(current => {
            if (!current.length) return current;
            const lastIndex = current.length - 1;
            return current.map((detail, idx) => idx === lastIndex ? { ...detail, productId: product.id } : detail);
        });
    }
}
