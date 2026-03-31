import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';

interface LineaBalance {
    codigo: string;
    nombre: string;
    monto: number;
}

@Component({
    selector: 'app-balance-general',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe],
    templateUrl: './balance-general.component.html'
})
export class BalanceGeneralComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private periodoService = inject(PeriodoService);

    readonly periodos = signal<PeriodoContable[]>([]);
    readonly periodoId = signal<string>('');
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly lineas = signal<{ cuentaCodigo: string; cuentaNombre: string; saldoDeudor: number; saldoAcreedor: number }[]>([]);

    // PCGE 2020: Activo → grupos 1 y 2 (saldo deudor)
    readonly activo = computed<LineaBalance[]>(() =>
        this.lineas()
            .filter(l => /^[12]/.test(l.cuentaCodigo) && l.saldoDeudor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoDeudor }))
    );

    // PCGE 2020: Pasivo → grupos 4 (cuentas por pagar) y parte de 3 (saldo acreedor cuentas reales)
    readonly pasivo = computed<LineaBalance[]>(() =>
        this.lineas()
            .filter(l => /^4/.test(l.cuentaCodigo) && l.saldoAcreedor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoAcreedor }))
    );

    // PCGE 2020: Patrimonio → grupo 5
    readonly patrimonio = computed<LineaBalance[]>(() =>
        this.lineas()
            .filter(l => /^5/.test(l.cuentaCodigo) && l.saldoAcreedor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoAcreedor }))
    );

    readonly totalActivo = computed(() => this.activo().reduce((s, l) => s + l.monto, 0));
    readonly totalPasivo = computed(() => this.pasivo().reduce((s, l) => s + l.monto, 0));
    readonly totalPatrimonio = computed(() => this.patrimonio().reduce((s, l) => s + l.monto, 0));
    readonly ecuacionCuadra = computed(() =>
        Math.abs(this.totalActivo() - this.totalPasivo() - this.totalPatrimonio()) < 0.01
    );
    readonly diferencia = computed(() =>
        Math.abs(this.totalActivo() - this.totalPasivo() - this.totalPatrimonio())
    );

    ngOnInit(): void {
        this.periodoService.listar().subscribe({
            next: periodos => {
                this.periodos.set(periodos);
                const abierto = periodos.find(p => p.estado === 'ABIERTO') ?? periodos[0];
                if (abierto) {
                    this.periodoId.set(abierto.id);
                    this.cargarBalance();
                }
            },
            error: () => this.error.set('No se pudo cargar la lista de periodos')
        });
    }

    onPeriodoChange(event: Event): void {
        this.periodoId.set((event.target as HTMLSelectElement).value);
        this.cargarBalance();
    }

    private cargarBalance(): void {
        const pid = this.periodoId();
        if (!pid) return;
        this.isLoading.set(true);
        this.error.set(null);
        this.asientoService.obtenerBalanceComprobacion(pid).subscribe({
            next: (data: { cuentaCodigo: string; cuentaNombre: string; saldoDeudor: number; saldoAcreedor: number }[]) => {
                this.lineas.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el balance de comprobación. Verifica que el servicio de contabilidad esté activo.');
                this.isLoading.set(false);
            }
        });
    }
}
