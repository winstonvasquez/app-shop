import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';
import { ESTADO_PEDIDO_BADGE, EstadoPedido } from '@shared/constants/order-status.constants';

@Component({
    selector: 'app-order-confirmation',
    standalone: true,
    imports: [RouterLink, DatePipe, DecimalPipe],
    templateUrl: './order-confirmation.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmationComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);

    order = signal<OrderResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    ngOnInit(): void {
        const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
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

    /**
     * Clase de badge según el estado del pedido, leída de `ESTADO_PEDIDO_BADGE` (fuente única
     * del frontend, espejo del `EstadoPedido` del backend). El ámbar es el estado por defecto:
     * un estado que no esté en el mapa se pinta como «en curso», nunca como éxito ni como error.
     */
    badgeClass(estado: string | undefined): string {
        const clave = (estado ?? '').toUpperCase() as EstadoPedido;
        return ESTADO_PEDIDO_BADGE[clave] ?? 'badge-warning';
    }
}
