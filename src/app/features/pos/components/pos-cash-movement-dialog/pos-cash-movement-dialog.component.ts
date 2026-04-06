import { Component, ChangeDetectionStrategy, output, signal, computed } from '@angular/core';
import { MovimientoCajaRequest } from '../../services/pos-movimientos-caja.service';

@Component({
    selector: 'app-pos-cash-movement-dialog',
    standalone: true,
    templateUrl: './pos-cash-movement-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCashMovementDialogComponent {

    readonly confirmed = output<MovimientoCajaRequest>();
    readonly cancel = output<void>();

    readonly tipo = signal<'INGRESO' | 'RETIRO'>('INGRESO');
    readonly monto = signal(0);
    readonly motivo = signal('');

    readonly isValid = computed(() => this.monto() > 0 && this.motivo().trim().length > 0);

    onConfirm(): void {
        if (!this.isValid()) return;
        this.confirmed.emit({
            tipo: this.tipo(),
            monto: this.monto(),
            motivo: this.motivo().trim(),
        });
    }

    onCancel(): void {
        this.cancel.emit();
    }
}
