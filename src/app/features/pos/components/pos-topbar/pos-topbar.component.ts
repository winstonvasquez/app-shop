import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TurnoCaja } from '../../models/turno-caja.model';

export type PosScreen = 'main' | 'pago' | 'recibo' | 'historial' | 'turno' | 'devoluciones' | 'ordenes-retenidas' | 'movimientos-caja' | 'reporte';

@Component({
    selector: 'app-pos-topbar',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './pos-topbar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTopbarComponent {
    readonly turno = input<TurnoCaja | null>(null);
    readonly clockTime = input('');
    readonly clockDate = input('');

    readonly abrirTurno = output<void>();
    readonly cerrarTurno = output<void>();
    readonly navigate = output<PosScreen>();
}
