import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { OrderService } from '@core/services/order.service';
import { OrderResponse } from '@core/models/order.model';

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
}
