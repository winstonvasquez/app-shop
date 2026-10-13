import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { AuthService } from '@core/auth/auth.service';
import { GuestSessionService } from '@core/services/guest-session.service';
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
    protected auth = inject(AuthService);
    private guestSession = inject(GuestSessionService);

    order = signal<OrderResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);
    /** Invitado sin token de este pedido (otra pestaña, sesión borrada): no se puede leer el detalle. */
    sinDetalle = signal(false);
    orderId = signal(0);

    ngOnInit(): void {
        const orderId = Number(this.route.snapshot.paramMap.get('orderId'));
        if (!orderId) {
            this.error.set('ID de pedido inválido.');
            this.loading.set(false);
            return;
        }

        this.orderId.set(orderId);
        if (!this.auth.currentUser() && !this.guestSession.tokenDe(orderId)) {
            this.sinDetalle.set(true);
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
