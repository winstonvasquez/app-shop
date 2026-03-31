import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';

/** Estados del pedido con orden de progresión para el timeline */
const ESTADOS_TIMELINE = [
    { key: 'PENDIENTE', label: 'Pendiente' },
    { key: 'PAGADO', label: 'Pagado' },
    { key: 'EN_PREPARACION', label: 'En preparación' },
    { key: 'ENVIADO', label: 'Enviado' },
    { key: 'ENTREGADO', label: 'Entregado' },
];

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './order-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);

    order = signal<OrderResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    readonly estadosTimeline = ESTADOS_TIMELINE;

    ngOnInit(): void {
        const orderId = Number(this.route.snapshot.paramMap.get('id'));
        if (!orderId) {
            this.error.set('ID de pedido inválido.');
            this.loading.set(false);
            return;
        }

        this.orderService.getById(orderId).subscribe({
            next: (o) => {
                this.order.set(o);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'No se pudo cargar el pedido.');
                this.loading.set(false);
            },
        });
    }

    /** Índice del estado actual en el timeline (0-based). */
    currentEstadoIndex(): number {
        const estado = this.order()?.estado ?? '';
        // Cancelado no encaja en el timeline lineal
        if (estado === 'CANCELADO') return -1;
        const idx = ESTADOS_TIMELINE.findIndex(e => e.key === estado);
        return idx >= 0 ? idx : 0;
    }

    getEstadoBadgeClass(estado: string): string {
        const map: Record<string, string> = {
            PENDIENTE: 'badge badge-warning',
            PAGADO: 'badge badge-accent',
            EN_PREPARACION: 'badge badge-accent',
            ENVIADO: 'badge badge-accent',
            ENTREGADO: 'badge badge-success',
            CANCELADO: 'badge badge-error',
        };
        return map[estado] ?? 'badge badge-neutral';
    }
}
