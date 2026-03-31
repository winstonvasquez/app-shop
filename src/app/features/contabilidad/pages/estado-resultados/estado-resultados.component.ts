import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService, PeriodoContable } from '../../services/periodo.service';

interface LineaEstado {
    codigo: string;
    nombre: string;
    monto: number;
}

@Component({
    selector: 'app-estado-resultados',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe],
    templateUrl: './estado-resultados.component.html'
})
export class EstadoResultadosComponent implements OnInit {
    private asientoService = inject(AsientoService);
    private periodoService = inject(PeriodoService);

    readonly periodos = signal<PeriodoContable[]>([]);
    readonly periodoId = signal<string>('');
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly lineas = signal<{ cuentaCodigo: string; cuentaNombre: string; saldoDeudor: number; saldoAcreedor: number }[]>([]);

    readonly periodoNombre = computed(() => {
        const p = this.periodos().find(x => x.id === this.periodoId());
        return p?.nombre ?? '';
    });

    // PCGE 2020: Ingresos → grupo 7 (saldo acreedor)
    readonly ingresos = computed<LineaEstado[]>(() =>
        this.lineas()
            .filter(l => /^7/.test(l.cuentaCodigo) && l.saldoAcreedor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoAcreedor }))
    );

    // PCGE 2020: Costo de ventas → cuenta 69 (saldo deudor)
    readonly costoVentas = computed<LineaEstado[]>(() =>
        this.lineas()
            .filter(l => /^69/.test(l.cuentaCodigo) && l.saldoDeudor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoDeudor }))
    );

    // PCGE 2020: Gastos operativos → grupos 9x (distribución funcional de gastos)
    readonly gastosOperativos = computed<LineaEstado[]>(() =>
        this.lineas()
            .filter(l => /^9/.test(l.cuentaCodigo) && l.saldoDeudor > 0)
            .map(l => ({ codigo: l.cuentaCodigo, nombre: l.cuentaNombre, monto: l.saldoDeudor }))
    );

    readonly totalIngresos = computed(() => this.ingresos().reduce((s, l) => s + l.monto, 0));
    readonly totalCostoVentas = computed(() => this.costoVentas().reduce((s, l) => s + l.monto, 0));
    readonly totalGastosOperativos = computed(() => this.gastosOperativos().reduce((s, l) => s + l.monto, 0));
    readonly utilidadBruta = computed(() => this.totalIngresos() - this.totalCostoVentas());
    readonly utilidadOperativa = computed(() => this.utilidadBruta() - this.totalGastosOperativos());

    readonly margenBruto = computed(() => {
        if (this.totalIngresos() === 0) return '0.0';
        return ((this.utilidadBruta() / this.totalIngresos()) * 100).toFixed(1);
    });

    readonly margenOperativo = computed(() => {
        if (this.totalIngresos() === 0) return '0.0';
        return ((this.utilidadOperativa() / this.totalIngresos()) * 100).toFixed(1);
    });

    ngOnInit(): void {
        this.periodoService.listar().subscribe({
            next: periodos => {
                this.periodos.set(periodos);
                const abierto = periodos.find(p => p.estado === 'ABIERTO') ?? periodos[0];
                if (abierto) {
                    this.periodoId.set(abierto.id);
                    this.cargarDatos();
                }
            },
            error: () => this.error.set('No se pudo cargar la lista de periodos')
        });
    }

    onPeriodoChange(event: Event): void {
        this.periodoId.set((event.target as HTMLSelectElement).value);
        this.cargarDatos();
    }

    private cargarDatos(): void {
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
                this.error.set('No se pudo cargar los datos contables. Verifica que el servicio esté activo.');
                this.isLoading.set(false);
            }
        });
    }
}
