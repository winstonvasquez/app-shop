import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { MetodoPagoPos, PagoMixto, TipoCpe } from '../../models/venta-pos.model';

@Component({
    selector: 'app-pos-order-panel',
    standalone: true,
    imports: [FormsModule, TranslateModule],
    templateUrl: './pos-order-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosOrderPanelComponent {

    readonly carrito = inject(PosCarritoService);

    readonly procesarVenta = output<void>();
    readonly irAlNumpad = output<void>();

    readonly paymentMethods: { id: MetodoPagoPos; label: string; icon: string; i18nKey: string }[] = [
        { id: 'EFECTIVO', label: 'Efectivo',  icon: 'cash', i18nKey: 'pos.panel.cash' },
        { id: 'TARJETA',  label: 'Tarjeta',   icon: 'card', i18nKey: 'pos.panel.card' },
        { id: 'YAPE',     label: 'Yape',      icon: 'yape', i18nKey: 'pos.panel.yape' },
        { id: 'PLIN',     label: 'Plin',      icon: 'plin', i18nKey: 'pos.panel.plin' },
    ];

    readonly splitMethods: { id: Exclude<MetodoPagoPos, 'MIXTO'>; label: string; i18nKey: string }[] = [
        { id: 'EFECTIVO', label: 'Efectivo', i18nKey: 'pos.panel.cash' },
        { id: 'TARJETA',  label: 'Tarjeta',  i18nKey: 'pos.panel.card' },
        { id: 'YAPE',     label: 'Yape',     i18nKey: 'pos.panel.yape' },
        { id: 'PLIN',     label: 'Plin',     i18nKey: 'pos.panel.plin' },
    ];

    readonly cpeOptions: { id: TipoCpe; label: string; i18nKey: string }[] = [
        { id: 'BOLETA',  label: 'Boleta',  i18nKey: 'pos.panel.boleta' },
        { id: 'FACTURA', label: 'Factura', i18nKey: 'pos.panel.factura' },
        { id: 'SIN_CPE', label: 'Sin CPE', i18nKey: 'pos.panel.sinCpe' },
    ];

    onClienteChange(nombre: string): void {
        this.carrito.setCliente(null, nombre);
    }

    onDescuentoChange(event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setDescuento(val);
    }

    onMontoRecibidoChange(event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setMontoRecibido(val);
    }

    onPagoMontoChange(index: number, event: Event): void {
        const val = parseFloat((event.target as HTMLInputElement).value) || 0;
        this.carrito.setPagoMonto(index, val);
    }

    onPagoMetodoChange(index: number, event: Event): void {
        const metodo = (event.target as HTMLSelectElement).value as Exclude<MetodoPagoPos, 'MIXTO'>;
        this.carrito.setPagoMetodo(index, metodo);
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    bgColor(id: number): string {
        return 'prod-bg-' + (id % 7);
    }
}
