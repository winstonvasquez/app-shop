import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { PickingService } from '../../services/picking.service';
import { PickingOrder, PickingItem } from '../../models/picking.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-picking-mobile',
    standalone: true,
    imports: [ButtonComponent],
    templateUrl: './picking-mobile.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PickingMobileComponent implements OnInit {
    private readonly pickingService = inject(PickingService);

    orders = signal<PickingOrder[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    pickingItemId = signal<string | null>(null);

    /** Un ítem se considera recogido cuando la cantidad recogida cubre la solicitada. */
    private isPicked(i: PickingItem): boolean {
        return i.cantidadRecogida >= i.cantidadSolicitada;
    }

    totalItems = computed(() =>
        this.orders().reduce((sum, o) => sum + o.items.length, 0)
    );

    pickedItems = computed(() =>
        this.orders().reduce((sum, o) => sum + o.items.filter(i => this.isPicked(i)).length, 0)
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
            cantidadRecogida: item.cantidadSolicitada
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

    /** Progreso de la orden: ítems recogidos / total. */
    orderProgress(order: PickingOrder): number {
        const total = order.items.length;
        if (total === 0) return 0;
        const picked = order.items.filter(i => this.isPicked(i)).length;
        return Math.round((picked / total) * 100);
    }

    /** Ítems aún por recoger, ya en orden de recorrido (el backend los devuelve por `secuencia`). */
    pendingItems(order: PickingOrder): PickingItem[] {
        return order.items.filter(i => !this.isPicked(i));
    }

    statusClass(status: string): string {
        switch (status) {
            case 'PICKING':  return 'bg-warning/10 text-warning';
            case 'PICKED':   return 'bg-success/10 text-success';
            case 'CANCELLED': return 'bg-error/10 text-error';
            default:         return 'bg-gray-100 text-gray-600';
        }
    }

    statusLabel(status: string): string {
        switch (status) {
            case 'PENDING_PICKING': return 'Pendiente';
            case 'PICKING':         return 'En proceso';
            case 'PICKED':          return 'Completado';
            case 'CANCELLED':       return 'Cancelado';
            default:                return status;
        }
    }
}
