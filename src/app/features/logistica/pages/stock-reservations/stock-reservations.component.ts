import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { StockReservationService } from '../../services/stock-reservation.service';
import { StockReservation, ReservationStatus } from '../../models/stock-reservation.model';

@Component({
    selector: 'app-stock-reservations',
    standalone: true,
    imports: [ReactiveFormsModule, DatePipe],
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
    reservation = signal<StockReservation | null>(null);

    buscar(): void {
        const orderId = (this.searchForm.value.orderId ?? '').trim();
        if (!orderId) {
            this.error.set('Ingresa el ID de la orden');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.reservation.set(null);
        this.reservationService.getByOrder(orderId).subscribe({
            next: (res) => {
                this.reservation.set(res);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('No se encontró reserva para la orden indicada');
                this.loading.set(false);
            }
        });
    }

    release(): void {
        const res = this.reservation();
        if (!res) return;
        this.actionId.set('release');
        this.reservationService.release(res.orderId, 'Liberado manualmente').subscribe({
            next: () => {
                this.reservation.update(r => r ? { ...r, status: 'RELEASED' as ReservationStatus } : r);
                this.actionId.set(null);
                this.showSuccess('Reserva liberada correctamente');
            },
            error: () => {
                this.error.set('Error al liberar la reserva');
                this.actionId.set(null);
            }
        });
    }

    consume(): void {
        const res = this.reservation();
        if (!res) return;
        this.actionId.set('consume');
        this.reservationService.consume(res.orderId).subscribe({
            next: () => {
                this.reservation.update(r => r ? { ...r, status: 'CONSUMED' as ReservationStatus } : r);
                this.actionId.set(null);
                this.showSuccess('Reserva consumida correctamente');
            },
            error: () => {
                this.error.set('Error al consumir la reserva');
                this.actionId.set(null);
            }
        });
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), 3000);
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
        return this.reservation()?.status === 'RESERVED';
    }

    canConsume(): boolean {
        return this.reservation()?.status === 'RESERVED';
    }
}
