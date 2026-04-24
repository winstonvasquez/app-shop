import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PickingService } from '../../services/picking.service';
import { PickingOrder, PickingItem } from '../../models/picking.model';

@Component({
    selector: 'app-picking-mobile',
    standalone: true,
    imports: [],
    templateUrl: './picking-mobile.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PickingMobileComponent implements OnInit {
    private readonly pickingService = inject(PickingService);

    orders = signal<PickingOrder[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    pickingItemId = signal<string | null>(null);

    totalItems = computed(() =>
        this.orders().reduce((sum, o) => sum + o.items.length, 0)
    );

    pickedItems = computed(() =>
        this.orders().reduce((sum, o) => sum + o.items.filter(i => i.status === 'PICKED').length, 0)
    );

    overallProgress = computed(() => {
        const total = this.totalItems();
        if (total === 0) return 0;
        return Math.round((this.pickedItems() / total) * 100);
    });

    ngOnInit(): void {
        this.loadOrders();
    }

    loadOrders(): void {
        this.loading.set(true);
        this.error.set(null);
        this.pickingService.getMyOrders().subscribe({
            next: (orders) => {
                this.orders.set(orders);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar las ordenes de picking');
                this.loading.set(false);
            }
        });
    }

    pickItem(orderId: string, item: PickingItem): void {
        if (this.pickingItemId() === item.id) return;
        this.pickingItemId.set(item.id);
        this.pickingService.pickItem(orderId, item.id, {
            pickedQty: item.requestedQty
        }).subscribe({
            next: (updated) => {
                this.orders.update(list =>
                    list.map(o => o.id === orderId ? updated : o)
                );
                this.pickingItemId.set(null);
            },
            error: () => {
                this.pickingItemId.set(null);
            }
        });
    }

    orderProgress(order: PickingOrder): number {
        return Math.round(order.completionPercent);
    }

    pendingItems(order: PickingOrder): PickingItem[] {
        return order.items.filter(i => i.status === 'PENDING');
    }

    statusClass(status: string): string {
        switch (status) {
            case 'IN_PROGRESS': return 'bg-warning/10 text-warning';
            case 'COMPLETED': return 'bg-success/10 text-success';
            case 'ASSIGNED': return 'bg-info/10 text-info';
            default: return 'bg-gray-100 text-gray-600';
        }
    }
}
