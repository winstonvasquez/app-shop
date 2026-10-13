import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TurnoCaja } from '../../models/turno-caja.model';

@Component({
    selector: 'app-pos-turno',
    standalone: true,
    imports: [DatePipe, TranslateModule],
    templateUrl: './pos-turno.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTurnoComponent {
    readonly turno = input<TurnoCaja | null>(null);

    /** Monto de apertura de caja (S/ ≥ 0) tecleado por el cajero. */
    readonly abrirTurno = output<number>();
    readonly cerrarTurno = output<void>();
    readonly volver = output<void>();
    readonly reporteX = output<void>();
    readonly movimientoCaja = output<void>();
    readonly cierreArqueo = output<void>();

    readonly montoAperturaTxt = signal('');
    /** Monto válido (número ≥ 0) o null si el campo está vacío / es inválido. */
    readonly montoApertura = computed(() => {
        const txt = this.montoAperturaTxt().trim();
        const n = Number(txt);
        return txt !== '' && Number.isFinite(n) && n >= 0 ? n : null;
    });

    confirmarApertura(): void {
        const monto = this.montoApertura();
        if (monto !== null) this.abrirTurno.emit(monto);
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
