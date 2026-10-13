import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { VentaPosResponse } from '../../models/venta-pos.model';
import QRCode from 'qrcode';

@Component({
    selector: 'app-pos-receipt',
    standalone: true,
    imports: [DatePipe, DecimalPipe, TranslateModule],
    templateUrl: './pos-receipt.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosReceiptComponent {
    readonly venta = input<VentaPosResponse | null>(null);

    readonly nuevaVenta = output<void>();
    readonly imprimirRecibo = output<void>();
    /** Solicita anular esta venta (el padre exige PIN de supervisor). Emite el id. */
    readonly anularVenta = output<number>();

    /** Data-URL del QR SUNAT escaneable, generado desde venta().qrData. */
    readonly qrImage = signal<string | null>(null);

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

    // «Enviar recibo por email» retirado: el backend respondía `queued` y nunca enviaba nada.
}
