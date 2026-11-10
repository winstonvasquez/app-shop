import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EstadosFinancierosService, EstadoResultados, LineaBalance } from '../../services/estados-financieros.service';
import { PeriodoService } from '../../services/periodo.service';

/** Estado de Resultados ACUMULADO del año: ingresos (clase 7) - gastos (clase 6; el costo de ventas es la 69). */
@Component({
    selector: 'app-estado-resultados',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe],
    templateUrl: './estado-resultados.component.html'
})
export class EstadoResultadosComponent implements OnInit {
    private estados = inject(EstadosFinancierosService);
    private periodoService = inject(PeriodoService);

    readonly annos = signal<number[]>([new Date().getFullYear()]);
    readonly anno = signal(new Date().getFullYear());
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly estado = signal<EstadoResultados | null>(null);

    readonly ingresos = computed<LineaBalance[]>(() => this.estado()?.ingresos ?? []);
    readonly costoVentas = computed<LineaBalance[]>(() =>
        (this.estado()?.gastos ?? []).filter(l => l.codigo.startsWith('69'))
    );
    readonly otrosGastos = computed<LineaBalance[]>(() =>
        (this.estado()?.gastos ?? []).filter(l => !l.codigo.startsWith('69'))
    );

    readonly totalIngresos = computed(() => this.estado()?.totalIngresos ?? 0);
    readonly totalCostoVentas = computed(() => this.costoVentas().reduce((s, l) => s + l.saldo, 0));
    readonly utilidadBruta = computed(() => this.estado()?.utilidadBruta ?? 0);
    readonly utilidadNeta = computed(() => this.estado()?.utilidadNeta ?? 0);

    readonly margenBruto = computed(() => this.margen(this.utilidadBruta()));
    readonly margenNeto = computed(() => this.margen(this.utilidadNeta()));

    ngOnInit(): void {
        this.periodoService.listar().subscribe({
            next: periodos => {
                const annos = [...new Set(periodos.map(p => p.anno))].sort((a, b) => b - a);
                if (annos.length > 0) {
                    this.annos.set(annos);
                    if (!annos.includes(this.anno())) this.anno.set(annos[0]);
                }
                this.cargarDatos();
            },
            error: () => this.cargarDatos()
        });
    }

    onAnnoChange(event: Event): void {
        this.anno.set(+(event.target as HTMLSelectElement).value);
        this.cargarDatos();
    }

    private margen(utilidad: number): string {
        const ing = this.totalIngresos();
        return ing === 0 ? '0.0' : ((utilidad / ing) * 100).toFixed(1);
    }

    private cargarDatos(): void {
        this.isLoading.set(true);
        this.error.set(null);
        this.estados.estadoResultados(this.anno()).subscribe({
            next: data => {
                this.estado.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el estado de resultados. Verifica que el servicio esté activo.');
                this.isLoading.set(false);
            }
        });
    }
}
