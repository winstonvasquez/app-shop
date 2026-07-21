import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
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

    readonly isFullscreen = signal(false);

    constructor() {
        if (typeof document !== 'undefined') {
            document.addEventListener('fullscreenchange', () => {
                this.isFullscreen.set(!!document.fullscreenElement);
            });
        }
    }

    toggleFullscreen(): void {
        if (typeof document === 'undefined') return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable full-screen mode:', err);
            });
        }
    }
}
