import { Component, ChangeDetectionStrategy, inject, output, signal, computed } from '@angular/core';
import { PosCarritoService } from '../../services/pos-carrito.service';

@Component({
    selector: 'app-pos-numpad',
    standalone: true,
    templateUrl: './pos-numpad.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosNumpadComponent {

    readonly carrito = inject(PosCarritoService);

    readonly confirmar = output<void>();
    readonly volver = output<void>();

    readonly numpadValue = signal('');
    readonly quickAmounts = [10, 20, 50, 100, 200];

    readonly numpadDisplay = computed(() => {
        const v = this.numpadValue();
        if (!v) return 'S/ 0.00';
        return 'S/ ' + (parseFloat(v) / 100).toFixed(2);
    });

    readonly vueltoNumpad = computed(() => {
        const total = this.carrito.totalConDescuento();
        const entered = parseFloat(this.numpadValue()) / 100 || 0;
        return Math.max(0, entered - total);
    });

    numpadInput(key: string): void {
        if (key === 'del') {
            this.numpadValue.update(v => v.slice(0, -1));
        } else if (key === '.' && this.numpadValue().includes('.')) {
            return;
        } else {
            this.numpadValue.update(v => v + key);
        }
        const entered = parseFloat(this.numpadValue()) / 100 || 0;
        this.carrito.setMontoRecibido(entered);
    }

    setQuickAmount(amount: number): void {
        this.numpadValue.set(String(amount * 100));
        this.carrito.setMontoRecibido(amount);
    }

    fmt(val: number): string {
        return val.toFixed(2);
    }
}
