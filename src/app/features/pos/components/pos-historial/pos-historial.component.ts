import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { TurnoCaja } from '../../models/turno-caja.model';

@Component({
    selector: 'app-pos-historial',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './pos-historial.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosHistorialComponent {
    readonly items = input.required<VentaPosResponse[]>();
    readonly turno = input<TurnoCaja | null>(null);

    readonly verRecibo = output<VentaPosResponse>();

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    pagoBadgeClass(metodo: string): string {
        const map: Record<string, string> = {
            EFECTIVO: 'badge-pago badge-pago--efectivo',
            TARJETA:  'badge-pago badge-pago--tarjeta',
            YAPE:     'badge-pago badge-pago--yape',
            PLIN:     'badge-pago badge-pago--plin',
        };
        return map[metodo] ?? 'badge-pago';
    }

    ticketPromedio(t: TurnoCaja): string {
        if (!t.totalTransacciones) return '0.00';
        return (t.totalVentas / t.totalTransacciones).toFixed(2);
    }
}
