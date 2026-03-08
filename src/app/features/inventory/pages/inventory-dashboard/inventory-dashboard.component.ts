import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryApiService, DashboardSummary } from '../../services/inventory-api.service';

@Component({
    selector: 'app-inventory-dashboard',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="space-y-6">
            <header class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold text-on">Dashboard de Inventario</h1>
                <p class="text-sm text-subtle">Resumen general de stock y movimientos recientes.</p>
            </header>

            @if (loading()) {
                <div class="rounded-lg border border-border bg-surface p-6 text-sm text-subtle">Cargando resumen...</div>
            }

            @if (error()) {
                <div class="rounded-lg border border-red-200 bg-error/10 p-4 text-sm text-error-hover">{{ error() }}</div>
            }

            @if (summary()) {
                <div class="grid gap-4 md:grid-cols-4">
                    <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-subtle">Stock total</p>
                        <p class="mt-2 text-2xl font-bold text-on">{{ summary()?.totalStock }}</p>
                    </div>
                    <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-subtle">Productos bajo stock</p>
                        <p class="mt-2 text-2xl font-bold text-warning-hover">{{ summary()?.lowStockProducts }}</p>
                    </div>
                    <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-subtle">Transferencias pendientes</p>
                        <p class="mt-2 text-2xl font-bold text-on">{{ summary()?.pendingTransfers }}</p>
                    </div>
                    <div class="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
                        <p class="text-xs uppercase tracking-wide text-subtle">Movimientos 7 días</p>
                        <p class="mt-2 text-2xl font-bold text-primary">{{ recentMovements().length }}</p>
                    </div>
                </div>

                <div class="grid gap-4 lg:grid-cols-3">
                    <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm lg:col-span-2">
                        <div class="flex items-center justify-between">
                            <h2 class="text-sm font-semibold text-on">Tendencia semanal</h2>
                            <span class="text-xs text-subtle">{{ recentMovements().length }} movimientos</span>
                        </div>
                        <div class="mt-4 grid grid-cols-7 gap-3 items-end">
                            @for (day of weeklyMovements(); track day.label) {
                                <div class="flex flex-col items-center gap-2 text-xs text-gray-400">
                                    <div class="flex h-28 w-full items-end">
                                        <div class="w-full rounded-lg bg-primary/15" [style.height.%]="day.ratio"></div>
                                    </div>
                                    <span>{{ day.label }}</span>
                                </div>
                            }
                        </div>
                    </div>

                    <div class="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <h2 class="text-sm font-semibold text-on">Últimos movimientos</h2>
                            <span class="text-xs text-subtle">{{ recentMovements().length }} registros</span>
                        </div>
                        <div class="mt-4 space-y-3">
                            @for (movement of recentMovements(); track movement.id) {
                                <div class="flex flex-col gap-1 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm font-semibold text-on">{{ movement.productName || movement.productId }}</span>
                                        <span class="text-[10px] font-semibold uppercase text-primary">{{ movement.movementType }}</span>
                                    </div>
                                    <div class="text-xs text-subtle">
                                        {{ movement.warehouseName }} · {{ movement.quantity }} uds · {{ movement.movementDate || movement.createdAt | date:'short' }}
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            }
        </section>
    `
})
export class InventoryDashboardComponent {
    private readonly api = inject(InventoryApiService);

    summary = signal<DashboardSummary | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);

    recentMovements = computed(() => this.summary()?.recentMovements ?? []);
    weeklyMovements = computed(() => {
        const now = new Date();
        const movements = this.recentMovements();
        const days = Array.from({ length: 7 }).map((_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            const label = date.toLocaleDateString('es-PE', { weekday: 'short' });
            const count = movements.filter(movement => {
                const movementDate = new Date(movement.movementDate || movement.createdAt);
                return movementDate.toDateString() === date.toDateString();
            }).length;
            return { label, count };
        });
        const maxCount = Math.max(...days.map(day => day.count), 1);
        return days.map(day => ({
            ...day,
            ratio: Math.round((day.count / maxCount) * 100)
        }));
    });

    constructor() {
        this.loadSummary();
    }

    private loadSummary(): void {
        this.loading.set(true);
        this.error.set(null);
        this.api.getDashboardSummary().subscribe({
            next: (response) => {
                this.summary.set(response);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }
}
