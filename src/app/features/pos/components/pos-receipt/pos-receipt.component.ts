import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { PosVentaService } from '../../services/pos-venta.service';

@Component({
    selector: 'app-pos-receipt',
    standalone: true,
    imports: [DatePipe, FormsModule, TranslateModule],
    templateUrl: './pos-receipt.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosReceiptComponent {
    private readonly ventaService = inject(PosVentaService);

    readonly venta = input<VentaPosResponse | null>(null);

    readonly nuevaVenta = output<void>();
    readonly imprimirRecibo = output<void>();

    readonly emailInput = signal('');
    readonly emailSending = signal(false);
    readonly emailSent = signal(false);

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    enviarEmail(): void {
        const v = this.venta();
        const email = this.emailInput().trim();
        if (!v || !email) return;
        this.emailSending.set(true);
        this.ventaService.enviarRecibo(v.id, email).subscribe({
            next: () => {
                this.emailSending.set(false);
                this.emailSent.set(true);
                setTimeout(() => this.emailSent.set(false), 3000);
            },
            error: () => this.emailSending.set(false),
        });
    }
}
