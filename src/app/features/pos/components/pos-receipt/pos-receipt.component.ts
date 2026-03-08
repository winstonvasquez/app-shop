import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VentaPosResponse } from '../../models/venta-pos.model';

@Component({
    selector: 'app-pos-receipt',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './pos-receipt.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosReceiptComponent {
    readonly venta = input<VentaPosResponse | null>(null);

    readonly nuevaVenta = output<void>();
    readonly imprimirRecibo = output<void>();

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
