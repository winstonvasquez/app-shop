import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TurnoCaja } from '../../models/turno-caja.model';

@Component({
    selector: 'app-pos-turno',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './pos-turno.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTurnoComponent {
    readonly turno = input<TurnoCaja | null>(null);

    readonly abrirTurno = output<void>();
    readonly cerrarTurno = output<void>();
    readonly volver = output<void>();

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
