import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TipoCambioService, TipoCambio, TipoCambioRequest } from '../../services/tipo-cambio.service';

const MONEDAS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF'] as const;

@Component({
    selector: 'app-tipo-cambio',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DecimalPipe, DatePipe, TranslatePipe],
    templateUrl: './tipo-cambio.component.html',
})
export class TipoCambioComponent implements OnInit {
    private service = inject(TipoCambioService);
    private translate = inject(TranslateService);

    readonly monedas = MONEDAS;
    readonly moneda = signal<string>('USD');
    readonly fecha = signal(new Date().toISOString().substring(0, 10));
    readonly resultado = signal<TipoCambio | null>(null);
    readonly cargando = signal(false);
    readonly guardando = signal(false);
    readonly error = signal('');
    readonly exito = signal('');

    compra = signal(0);
    venta = signal(0);

    ngOnInit() {
        this.consultar();
    }

    consultar() {
        this.cargando.set(true);
        this.error.set('');
        this.resultado.set(null);
        this.service.obtener(this.fecha(), this.moneda()).subscribe({
            next: tc => {
                this.resultado.set(tc);
                this.compra.set(tc.compra);
                this.venta.set(tc.venta);
                this.cargando.set(false);
            },
            error: () => {
                this.compra.set(0);
                this.venta.set(0);
                this.cargando.set(false);
            },
        });
    }

    registrar() {
        if (!this.compra() || !this.venta()) return;
        const req: TipoCambioRequest = {
            fecha: this.fecha(),
            moneda: this.moneda(),
            compra: this.compra(),
            venta: this.venta(),
        };
        this.guardando.set(true);
        this.error.set('');
        this.exito.set('');
        this.service.registrar(req).subscribe({
            next: tc => {
                this.resultado.set(tc);
                this.exito.set(
                    this.translate.instant('contabilidad.tipo_cambio.exito', {
                        moneda: tc.moneda,
                        fecha: tc.fecha,
                    })
                );
                this.guardando.set(false);
            },
            error: err => {
                this.error.set(err?.error?.detail ?? this.translate.instant('contabilidad.tipo_cambio.error'));
                this.guardando.set(false);
            },
        });
    }
}
