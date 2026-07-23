import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { PosVentaService } from '../../services/pos-venta.service';
import QRCode from 'qrcode';
import { NOTIFICATION_DURATION } from '@shared/constants/ui.constants';

@Component({
    selector: 'app-pos-receipt',
    standalone: true,
    imports: [DatePipe, DecimalPipe, ReactiveFormsModule, TranslateModule],
    templateUrl: './pos-receipt.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosReceiptComponent {
    private readonly ventaService = inject(PosVentaService);
    private readonly fb = inject(FormBuilder);

    readonly venta = input<VentaPosResponse | null>(null);

    readonly nuevaVenta = output<void>();
    readonly imprimirRecibo = output<void>();
    /** Solicita anular esta venta (el padre exige PIN de supervisor). Emite el id. */
    readonly anularVenta = output<number>();

    readonly emailSending = signal(false);
    readonly emailSent = signal(false);
    /** Data-URL del QR SUNAT escaneable, generado desde venta().qrData. */
    readonly qrImage = signal<string | null>(null);

    readonly emailForm = this.fb.group({
        email: [''],
    });

    constructor() {
        // Genera el QR escaneable cada vez que cambia la venta mostrada.
        effect(() => {
            const data = this.venta()?.qrData;
            if (!data) { this.qrImage.set(null); return; }
            QRCode.toDataURL(data, { margin: 1, width: 180, errorCorrectionLevel: 'M' })
                .then(url => this.qrImage.set(url))
                .catch(() => this.qrImage.set(null));
        });
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    enviarEmail(): void {
        const v = this.venta();
        const email = (this.emailForm.value.email ?? '').trim();
        if (!v || !email) return;
        this.emailSending.set(true);
        this.ventaService.enviarRecibo(v.id, email).subscribe({
            next: () => {
                this.emailSending.set(false);
                this.emailSent.set(true);
                setTimeout(() => this.emailSent.set(false), NOTIFICATION_DURATION.medium);
            },
            error: () => this.emailSending.set(false),
        });
    }
}
