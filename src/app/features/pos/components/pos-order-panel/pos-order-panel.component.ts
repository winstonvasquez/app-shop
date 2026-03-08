import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { MetodoPagoPos, TipoCpe } from '../../models/venta-pos.model';

@Component({
    selector: 'app-pos-order-panel',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './pos-order-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosOrderPanelComponent {

    readonly carrito = inject(PosCarritoService);

    readonly procesarVenta = output<void>();
    readonly irAlNumpad = output<void>();

    readonly paymentMethods: { id: MetodoPagoPos; label: string; icon: string }[] = [
        { id: 'EFECTIVO', label: 'Efectivo',  icon: 'cash' },
        { id: 'TARJETA',  label: 'Tarjeta',   icon: 'card' },
        { id: 'YAPE',     label: 'Yape',      icon: 'yape' },
        { id: 'PLIN',     label: 'Plin',      icon: 'plin' },
    ];

    readonly cpeOptions: { id: TipoCpe; label: string }[] = [
        { id: 'BOLETA',  label: 'Boleta' },
        { id: 'FACTURA', label: 'Factura' },
        { id: 'SIN_CPE', label: 'Sin CPE' },
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

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }

    bgColor(id: number): string {
        return 'prod-bg-' + (id % 7);
    }
}
