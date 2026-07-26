import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StockReservationService } from '../../services/stock-reservation.service';
import { StockReservation, ReservationStatus } from '../../models/stock-reservation.model';
import { ButtonComponent } from '@shared/components';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';

@Component({
    selector: 'app-stock-reservations',
    standalone: true,
    imports: [ReactiveFormsModule, DatePipe, ButtonComponent],
    templateUrl: './stock-reservations.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockReservationsComponent {
    private readonly reservationService = inject(StockReservationService);
    private readonly fb = inject(FormBuilder);

    searchForm = this.fb.group({
        orderId: ['']
    });

    loading    = signal(false);
    actionId   = signal<string | null>(null);
    error      = signal<string | null>(null);
    successMsg = signal<string | null>(null);

    /**
     * El backend devuelve UNA reserva POR PRODUCTO del pedido
     * (`List<StockReservationResponse>`), no un agregado con `items[]`.
     * Fix 2026-07-26: antes se guardaba el array crudo en una señal tipada como
     * objeto singular y el template reventaba con `res.items.length` (undefined).
     */
    reservations = signal<StockReservation[]>([]);

    /** Pedido consultado (todas las filas comparten orderId) */
    orderId = computed(() => this.reservations()[0]?.orderId ?? null);

    /** Estado del pedido: RESERVED si al menos una línea sigue reservada. */
    estadoGlobal = computed<ReservationStatus | null>(() => {
        const rows = this.reservations();
        if (rows.length === 0) return null;
        return rows.some(r => r.status === 'RESERVED') ? 'RESERVED' : rows[0].status;
    });

    totalUnidades = computed(() => this.reservations().reduce((acc, r) => acc + (r.cantidad ?? 0), 0));

    buscar(): void {
        const orderId = (this.searchForm.value.orderId ?? '').trim();
        if (!orderId) {
            this.error.set('Ingresa el ID de la orden');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.reservations.set([]);
        this.reservationService.getByOrder(orderId).subscribe({
            next: (res) => {
                this.reservations.set(res ?? []);
                if ((res ?? []).length === 0) {
                    this.error.set('No se encontraron reservas para la orden indicada');
                }
                this.loading.set(false);
            },
            error: () => {
                this.error.set('No se encontró reserva para la orden indicada');
                this.loading.set(false);
            }
        });
    }

    release(): void {
        const orderId = this.orderId();
        if (!orderId) return;
        this.actionId.set('release');
        this.reservationService.release(orderId, 'Liberado manualmente').subscribe({
            next: () => {
                this.marcarTodas('RELEASED');
                this.actionId.set(null);
                this.showSuccess('Reservas liberadas correctamente');
            },
            error: () => {
                this.error.set('Error al liberar la reserva');
                this.actionId.set(null);
            }
        });
    }

    consume(): void {
        const orderId = this.orderId();
        if (!orderId) return;
        this.actionId.set('consume');
        this.reservationService.consume(orderId).subscribe({
            next: () => {
                this.marcarTodas('CONSUMED');
                this.actionId.set(null);
                this.showSuccess('Reservas consumidas correctamente');
            },
            error: () => {
                this.error.set('Error al consumir la reserva');
                this.actionId.set(null);
            }
        });
    }

    /** liberar()/consumir() del backend operan sobre TODAS las reservas RESERVED del pedido. */
    private marcarTodas(status: ReservationStatus): void {
        this.reservations.update(rows =>
            rows.map(r => r.status === 'RESERVED' ? { ...r, status } : r));
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), NOTIFICATION_DURATION.medium);
    }

    statusClass(status: ReservationStatus): string {
        switch (status) {
            case 'RESERVED': return 'bg-info/10 text-info';
            case 'RELEASED': return 'bg-gray-100 text-gray-600';
            case 'CONSUMED': return 'bg-success/10 text-success';
            case 'EXPIRED':  return 'bg-error/10 text-error';
            default:         return 'bg-gray-100 text-gray-600';
        }
    }

    statusLabel(status: ReservationStatus): string {
        switch (status) {
            case 'RESERVED': return 'Reservado';
            case 'RELEASED': return 'Liberado';
            case 'CONSUMED': return 'Consumido';
            case 'EXPIRED':  return 'Expirado';
            default:         return status;
        }
    }

    canRelease(): boolean {
        return this.estadoGlobal() === 'RESERVED';
    }

    canConsume(): boolean {
        return this.estadoGlobal() === 'RESERVED';
    }
}
