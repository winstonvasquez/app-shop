import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AperturaTurnoForm, TurnoCaja } from '../../models/turno-caja.model';
import { Sucursal } from '../../models/venta-pos.model';
import { MovimientoCaja } from '../../services/pos-movimientos-caja.service';
import { PosTurnosGestionComponent } from '../pos-turnos-gestion/pos-turnos-gestion.component';

@Component({
    selector: 'app-pos-turno',
    standalone: true,
    imports: [DatePipe, TranslateModule, PosTurnosGestionComponent],
    templateUrl: './pos-turno.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTurnoComponent {
    readonly turno = input<TurnoCaja | null>(null);
    /** Ingresos y retiros del turno (incluye los RETIRO automáticos de las devoluciones). */
    readonly movimientos = input<MovimientoCaja[]>([]);

    /** Sucursales activas de la empresa (select de apertura; vacío = no se muestra). */
    readonly sucursales = input<Sucursal[]>([]);

    /** Monto de apertura de caja (S/ ≥ 0) tecleado por el cajero y sucursal elegida (opcional). */
    readonly abrirTurno = output<AperturaTurnoForm>();
    readonly cerrarTurno = output<void>();
    readonly volver = output<void>();
    readonly reporteX = output<void>();
    readonly movimientoCaja = output<void>();
    readonly cierreArqueo = output<void>();
    /** Reporte Z de un turno cerrado, elegido en el listado de supervisor. */
    readonly verReporteZ = output<number>();
    readonly turnoCerradoPorSupervisor = output<number>();

    /** Mismo cálculo que el arqueo del backend: apertura + efectivo + ingresos − retiros. */
    readonly efectivoEsperado = computed(() => {
        const t = this.turno();
        if (!t) return 0;
        const neto = this.movimientos().reduce((s, m) => s + (m.tipo === 'INGRESO' ? m.monto : -m.monto), 0);
        return t.montoApertura + t.totalEfectivo + neto;
    });

    readonly montoAperturaTxt = signal('');
    /** Monto válido (número ≥ 0) o null si el campo está vacío / es inválido. */
    readonly montoApertura = computed(() => {
        const txt = this.montoAperturaTxt().trim();
        const n = Number(txt);
        return txt !== '' && Number.isFinite(n) && n >= 0 ? n : null;
    });

    /** Elección explícita del cajero (id como texto del `<select>`); '' = ninguna. */
    readonly sucursalElegida = signal('');
    /** Con una sola sucursal se preselecciona; con varias, la que elija el cajero (o ninguna). */
    readonly sucursalId = computed(() => {
        const lista = this.sucursales();
        const elegida = Number(this.sucursalElegida());
        if (elegida && lista.some(s => s.id === elegida)) return elegida;
        return lista.length === 1 ? lista[0].id : undefined;
    });

    confirmarApertura(): void {
        const monto = this.montoApertura();
        if (monto !== null) this.abrirTurno.emit({ montoApertura: monto, sucursalId: this.sucursalId() });
    }

    fmt(val: number | undefined | null): string {
        return (val ?? 0).toFixed(2);
    }
}
