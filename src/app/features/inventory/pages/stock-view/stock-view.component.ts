import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryApiService } from '../../services/inventory-api.service';
import { InventoryStock, Warehouse } from '../../models/inventory.models';

@Component({
    selector: 'app-stock-view',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header>
                <h1 class="text-2xl font-bold text-on">Stock por almacén</h1>
                <p class="text-sm text-subtle">Consulta el stock disponible y los productos bajo mínimo.</p>
            </header>

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm space-y-4">
                <div>
                    <label class="text-xs font-semibold uppercase text-subtle">Almacén</label>
                    <select class="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm" (change)="onWarehouseSelectChange($event)">
                        <option value="">Selecciona un almacén</option>
                        @for (warehouse of warehouses(); track warehouse.id) {
                            <option [value]="warehouse.id">{{ warehouse.name }}</option>
                        }
                    </select>
                </div>

                <div class="flex flex-wrap gap-3 text-xs">
                    <button class="rounded-full border border-border px-3 py-1.5" (click)="loadLowStock()">Bajo stock</button>
                    <button class="rounded-full border border-border px-3 py-1.5" (click)="reloadWarehouseStock()">Ver almacén</button>
                </div>
            </div>

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-semibold text-on">Stock disponible</h2>
                    <span class="text-xs text-subtle">{{ stock().length }} registros</span>
                </div>
                <div class="mt-4 overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead class="text-left text-xs uppercase text-gray-400">
                            <tr>
                                <th class="py-2">Producto ID</th>
                                <th class="py-2">Stock</th>
                                <th class="py-2">Disponible</th>
                                <th class="py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-subtle">
                            @for (item of stock(); track item.id) {
                                <tr>
                                    <td class="py-3 font-medium text-on">{{ item.productId }}</td>
                                    <td class="py-3 text-on">{{ item.quantity }}</td>
                                    <td class="py-3 text-subtle">{{ item.availableQuantity ?? '-' }}</td>
                                    <td class="py-3">
                                        <span class="rounded-full px-2 py-1 text-xs" [class.bg-warning/10]="item.belowMinimum" [class.text-warning-hover]="item.belowMinimum" [class.bg-surface-sunken]="!item.belowMinimum" [class.text-subtle]="!item.belowMinimum">
                                            {{ item.belowMinimum ? 'Bajo mínimo' : 'OK' }}
                                        </span>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `
})
export class StockViewComponent {
    private readonly api = inject(InventoryApiService);

    warehouses = signal<Warehouse[]>([]);
    stock = signal<InventoryStock[]>([]);
    selectedWarehouseId = signal<number | null>(null);
    error = signal<string | null>(null);

    constructor() {
        this.loadWarehouses();
    }

    loadWarehouses(): void {
        this.api.getWarehouses().subscribe({
            next: (response) => this.warehouses.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    onWarehouseChange(warehouseId: string): void {
        this.selectedWarehouseId.set(warehouseId ? Number(warehouseId) : null);
        this.reloadWarehouseStock();
    }

    onWarehouseSelectChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.onWarehouseChange(value);
    }

    reloadWarehouseStock(): void {
        if (!this.selectedWarehouseId()) {
            this.stock.set([]);
            return;
        }
        this.api.getStockByWarehouse(this.selectedWarehouseId()!).subscribe({
            next: (response) => this.stock.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    loadLowStock(): void {
        this.api.getLowStock().subscribe({
            next: (response) => this.stock.set(response),
            error: (err: Error) => this.error.set(err.message)
        });
    }
}
