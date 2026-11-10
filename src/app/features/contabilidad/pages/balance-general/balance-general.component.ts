import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EstadosFinancierosService, BalanceGeneral, LineaBalance } from '../../services/estados-financieros.service';
import { PeriodoService } from '../../services/periodo.service';

/** Balance General ACUMULADO (PCGE 2020). El backend ya incluye «Resultado del ejercicio» en el patrimonio y en su total: aquí NO se vuelve a sumar. */
@Component({
    selector: 'app-balance-general',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe],
    templateUrl: './balance-general.component.html'
})
export class BalanceGeneralComponent implements OnInit {
    private estados = inject(EstadosFinancierosService);
    private periodoService = inject(PeriodoService);

    readonly annos = signal<number[]>([new Date().getFullYear()]);
    readonly anno = signal(new Date().getFullYear());
    readonly isLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly balance = signal<BalanceGeneral | null>(null);

    readonly activo = computed<LineaBalance[]>(() => this.balance()?.activos ?? []);
    readonly pasivo = computed<LineaBalance[]>(() => this.balance()?.pasivos ?? []);
    readonly patrimonio = computed<LineaBalance[]>(() => this.balance()?.patrimonio ?? []);

    readonly totalActivo = computed(() => this.balance()?.totalActivos ?? 0);
    readonly totalPasivo = computed(() => this.balance()?.totalPasivos ?? 0);
    readonly totalPatrimonio = computed(() => this.balance()?.totalPatrimonio ?? 0);
    readonly diferencia = computed(() =>
        Math.abs(this.totalActivo() - this.totalPasivo() - this.totalPatrimonio())
    );
    readonly ecuacionCuadra = computed(() => this.diferencia() < 0.01);

    ngOnInit(): void {
        this.periodoService.listar().subscribe({
            next: periodos => {
                const annos = [...new Set(periodos.map(p => p.anno))].sort((a, b) => b - a);
                if (annos.length > 0) {
                    this.annos.set(annos);
                    if (!annos.includes(this.anno())) this.anno.set(annos[0]);
                }
                this.cargarBalance();
            },
            error: () => this.cargarBalance()
        });
    }

    onAnnoChange(event: Event): void {
        this.anno.set(+(event.target as HTMLSelectElement).value);
        this.cargarBalance();
    }

    private cargarBalance(): void {
        this.isLoading.set(true);
        this.error.set(null);
        this.estados.balanceGeneral(this.anno()).subscribe({
            next: balance => {
                this.balance.set(balance);
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('No se pudo cargar el balance general. Verifica que el servicio de contabilidad esté activo.');
                this.isLoading.set(false);
            }
        });
    }
}
