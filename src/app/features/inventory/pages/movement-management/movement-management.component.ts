import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryMovement, InventoryMovementRequest, InventoryMovementType, Warehouse } from '../../models/inventory.models';
import { ProductLookupComponent } from '../../components/product-lookup/product-lookup.component';
import type { ProductResponse } from '@core/models/product.model';

@Component({
    selector: 'app-movement-management',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ProductLookupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Movimientos de inventario</h1>
                <p class="text-sm text-subtle">Registra entradas, salidas y ajustes en el stock.</p>
            </header>

            <app-product-lookup (selected)="onProductSelected($event)" />

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
                <div class="grid gap-4 md:grid-cols-4">
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Filtrar almacén</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onSelectChange($event, 'warehouseId')">
                            <option value="">Todos</option>
                            @for (warehouse of warehouses(); track warehouse.id) {
                                <option [value]="warehouse.id">{{ warehouse.name }}</option>
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase text-subtle">Tipo</label>
                        <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onSelectChange($event, 'movementType')">
                            <option value="">Todos</option>
                            @for (type of movementTypes; track type) {
                                <option [value]="type">{{ type }}</option>
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

            <form class="grid gap-4 rounded-xl border border-border-subtle bg-surface p-5 shadow-sm md:grid-cols-3" [formGroup]="movementForm" (ngSubmit)="onSubmit()">
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Producto ID</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="productId" placeholder="123">
                </div>
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
                    <label class="text-xs font-semibold uppercase text-subtle">Cantidad</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="quantity" placeholder="10">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Tipo</label>
                    <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="movementType">
                        @for (type of movementTypes; track type) {
                            <option [value]="type">{{ type }}</option>
                        }
                    </select>
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Fecha de movimiento</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="datetime-local" formControlName="movementDate">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Costo unitario</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="unitCost" placeholder="0.00">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Razón</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="reason" placeholder="Ajuste de inventario">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Referencia</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="referenceNumber" placeholder="OC-2024-001">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Tipo de referencia</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" formControlName="referenceType" placeholder="COMPRA">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Ubicación ID</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="locationId" placeholder="10">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Lote ID</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="lotId" placeholder="20">
                </div>
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Serie ID</label>
                    <input class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" type="number" formControlName="serialNumberId" placeholder="30">
                </div>
                <div class="md:col-span-3 flex justify-end">
                    <button type="submit" class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" [disabled]="movementForm.invalid || submitting()">
                        {{ submitting() ? 'Registrando...' : 'Registrar movimiento' }}
                    </button>
                </div>
            </form>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Movimientos recientes</h2>
                    <span class="text-xs text-subtle">{{ movements().length }} registros</span>
                </div>
                <div class="mt-3 flex justify-end">
                    <button class="rounded-full border border-border px-3 py-1 text-xs" type="button" (click)="exportMovements()">Exportar CSV</button>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Movimiento</th>
                                <th class="py-2">Producto</th>
                                <th class="py-2">Tipo</th>
                                <th class="py-2">Cantidad</th>
                                <th class="py-2">Almacén</th>
                                <th class="py-2">Fecha</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (movement of movements(); track movement.id) {
                                <tr>
                                    <td class="py-3 text-on">{{ movement.movementNumber || movement.id }}</td>
                                    <td class="py-3 text-on">{{ movement.productName || movement.productId }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-[11px] font-semibold" [class]="getMovementTypeClass(movement.movementType)">
                                            {{ movement.movementType }}
                                        </span>
                                    </td>
                                    <td class="py-3 text-on">{{ movement.quantity }}</td>
                                    <td class="py-3 text-muted">{{ movement.warehouseName }}</td>
                                    <td class="py-3 text-subtle">{{ (movement.movementDate || movement.createdAt) | date:'short' }}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-subtle">
                    <span>Página {{ movementPage() + 1 }} de {{ movementTotalPages() }}</span>
                    <div class="flex gap-2">
                        <button class="rounded-full border border-border px-3 py-1" (click)="changePage(movementPage() - 1)" [disabled]="movementPage() === 0">Anterior</button>
                        <button class="rounded-full border border-border px-3 py-1" (click)="changePage(movementPage() + 1)" [disabled]="movementPage() + 1 >= movementTotalPages()">Siguiente</button>
                    </div>
                </div>
            </div>
        </section>
    `
})
export class MovementManagementComponent {
    private readonly api = inject(InventoryApiService);
    private readonly fb = inject(FormBuilder);

    warehouses = signal<Warehouse[]>([]);
    movements = signal<InventoryMovement[]>([]);
    selectedProduct = signal<ProductResponse | null>(null);
    movementPage = signal(0);
    movementTotalPages = signal(1);
    movementPageSize = signal(10);
    submitting = signal(false);
    error = signal<string | null>(null);
    filterWarning = signal<string | null>(null);

    movementTypes: InventoryMovementType[] = [
        'ENTRADA_COMPRA',
        'ENTRADA_DEVOLUCION',
        'ENTRADA_AJUSTE',
        'ENTRADA_TRANSFERENCIA',
        'ENTRADA_PRODUCCION',
        'SALIDA_VENTA',
        'SALIDA_DEVOLUCION',
        'SALIDA_AJUSTE',
        'SALIDA_TRANSFERENCIA',
        'SALIDA_CONSUMO',
        'SALIDA_MERMA'
    ];

    movementForm = this.fb.nonNullable.group({
        productId: [0, [Validators.required, Validators.min(1)]],
        warehouseId: [0, [Validators.required, Validators.min(1)]],
        quantity: [0, [Validators.required, Validators.min(1)]],
        movementType: ['ENTRADA_COMPRA', [Validators.required]],
        movementDate: ['', [Validators.required]],
        unitCost: [0],
        reason: [''],
        referenceType: [''],
        referenceNumber: [''],
        locationId: [0],
        lotId: [0],
        serialNumberId: [0]
    });

    constructor() {
        this.loadWarehouses();
        this.loadMovements();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (response) => this.warehouses.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    loadMovements(): void {
        this.api.getMovements({
            page: this.movementPage(),
            size: this.movementPageSize(),
            warehouseId: this.filters().warehouseId || undefined,
            movementType: this.filters().movementType || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (response) => {
                this.movements.set(response.content);
                this.movementTotalPages.set(response.page.totalPages || 1);
            },
            error: (err: Error) => this.error.set(err.message)
        });
    }

    changePage(page: number): void {
        if (page < 0 || page >= this.movementTotalPages()) {
            return;
        }
        this.movementPage.set(page);
        this.loadMovements();
    }

    onSubmit(): void {
        if (this.movementForm.invalid) {
            this.movementForm.markAllAsTouched();
            return;
        }

        const payload: InventoryMovementRequest = {
            productId: this.movementForm.value.productId ?? 0,
            warehouseId: this.movementForm.value.warehouseId ?? 0,
            quantity: this.movementForm.value.quantity ?? 0,
            movementType: (this.movementForm.value.movementType ?? 'ENTRADA_COMPRA') as InventoryMovementType,
            movementDate: this.movementForm.value.movementDate ?? new Date().toISOString(),
            unitCost: this.movementForm.value.unitCost ?? undefined,
            reason: this.movementForm.value.reason ?? undefined,
            referenceType: this.movementForm.value.referenceType ?? undefined,
            referenceNumber: this.movementForm.value.referenceNumber ?? undefined,
            locationId: this.movementForm.value.locationId || undefined,
            lotId: this.movementForm.value.lotId || undefined,
            serialNumberId: this.movementForm.value.serialNumberId || undefined
        };

        this.submitting.set(true);
        this.api.createMovement(payload).subscribe({
            next: () => {
                this.submitting.set(false);
                this.movementForm.reset({ movementType: 'ENTRADA_COMPRA', movementDate: '' });
                this.selectedProduct.set(null);
                this.loadMovements();
            },
            error: (err: Error) => {
                this.submitting.set(false);
                this.error.set(err.message);
            }
        });
    }

    onProductSelected(product: ProductResponse): void {
        this.selectedProduct.set(product);
        this.movementForm.patchValue({
            productId: product.id
        });
    }

    filters = signal({
        warehouseId: 0,
        movementType: '',
        dateFrom: '',
        dateTo: ''
    });

    activeFilters(): Array<{ key: 'warehouseId' | 'movementType' | 'dateFrom' | 'dateTo'; label: string }> {
        const { warehouseId, movementType, dateFrom, dateTo } = this.filters();
        return [
            warehouseId ? { key: 'warehouseId', label: `Almacén: ${this.getWarehouseName(warehouseId)}` } : null,
            movementType ? { key: 'movementType', label: `Tipo: ${movementType}` } : null,
            dateFrom ? { key: 'dateFrom', label: `Desde: ${dateFrom}` } : null,
            dateTo ? { key: 'dateTo', label: `Hasta: ${dateTo}` } : null
        ].filter((value): value is { key: 'warehouseId' | 'movementType' | 'dateFrom' | 'dateTo'; label: string } => Boolean(value));
    }

    onFilterChange(key: 'warehouseId' | 'movementType' | 'dateFrom' | 'dateTo', value: string): void {
        const parsedValue = key === 'warehouseId' ? Number(value) : value;
        this.filters.update(current => ({ ...current, [key]: parsedValue }));
        if (this.hasInvalidDateRange()) {
            this.filterWarning.set('El rango de fechas no es válido.');
            return;
        }
        this.filterWarning.set(null);
        this.movementPage.set(0);
        this.loadMovements();
    }

    onSelectChange(event: Event, filterKey: 'warehouseId' | 'movementType'): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onFilterChange(filterKey, value);
    }

    onInputChange(event: Event, filterKey: 'dateFrom' | 'dateTo'): void {
        const value = (event.target as HTMLInputElement).value;
        this.onFilterChange(filterKey, value);
    }

    clearFilter(key: 'warehouseId' | 'movementType' | 'dateFrom' | 'dateTo'): void {
        this.filters.update(current => ({ ...current, [key]: key === 'warehouseId' ? 0 : '' }));
        this.loadMovements();
    }

    clearAllFilters(): void {
        this.filters.set({ warehouseId: 0, movementType: '', dateFrom: '', dateTo: '' });
        this.filterWarning.set(null);
        this.movementPage.set(0);
        this.loadMovements();
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

    getMovementTypeClass(type: InventoryMovementType): string {
        const base = 'bg-surface-sunken text-muted';
        const map: Partial<Record<InventoryMovementType, string>> = {
            ENTRADA_COMPRA: 'bg-emerald-100 text-emerald-700',
            ENTRADA_DEVOLUCION: 'bg-emerald-100 text-emerald-700',
            ENTRADA_AJUSTE: 'bg-sky-100 text-sky-700',
            ENTRADA_TRANSFERENCIA: 'bg-indigo-100 text-indigo-700',
            ENTRADA_PRODUCCION: 'bg-purple-100 text-purple-700',
            SALIDA_VENTA: 'bg-rose-100 text-rose-700',
            SALIDA_DEVOLUCION: 'bg-rose-100 text-rose-700',
            SALIDA_AJUSTE: 'bg-amber-100 text-amber-700',
            SALIDA_TRANSFERENCIA: 'bg-indigo-100 text-indigo-700',
            SALIDA_CONSUMO: 'bg-orange-100 text-orange-700',
            SALIDA_MERMA: 'bg-error/20 text-red-700'
        };
        return map[type] ?? base;
    }

    exportMovements(): void {
        this.api.exportInventoryReport({
            type: 'movements',
            warehouseId: this.filters().warehouseId || undefined,
            movementType: this.filters().movementType || undefined,
            dateFrom: this.filters().dateFrom || undefined,
            dateTo: this.filters().dateTo || undefined
        }).subscribe({
            next: (blob) => this.downloadBlob('movimientos-inventario.csv', blob),
            error: () => {
                const rows = this.movements().map(movement => ({
                    numero: movement.movementNumber || movement.id,
                    producto: movement.productName || movement.productId,
                    tipo: movement.movementType,
                    cantidad: movement.quantity,
                    almacen: movement.warehouseName || '',
                    fecha: movement.movementDate || movement.createdAt
                }));
                this.downloadCsv('movimientos-inventario.csv', rows);
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
}
