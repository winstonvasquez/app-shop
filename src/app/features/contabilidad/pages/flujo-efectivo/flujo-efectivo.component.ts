import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import type { ApexChart, ApexNonAxisChartSeries, ApexDataLabels, ApexLegend, ApexTooltip } from 'ng-apexcharts';
import { EstadosFinancierosService, FlujoEfectivo } from '../../services/estados-financieros.service';

@Component({
    selector: 'app-flujo-efectivo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, NgApexchartsModule],
    templateUrl: './flujo-efectivo.component.html',
})
export class FlujoEfectivoComponent implements OnInit {
    private service = inject(EstadosFinancierosService);

    readonly anno = signal(new Date().getFullYear());
    readonly flujo = signal<FlujoEfectivo | null>(null);
    readonly cargando = signal(false);
    readonly error = signal('');

    readonly flujoNeto = computed(() => this.flujo()?.flujoNeto ?? 0);
    readonly esPositivo = computed(() => this.flujoNeto() >= 0);

    readonly chartSeries = computed<ApexNonAxisChartSeries>(() => {
        const f = this.flujo();
        if (!f) return [0, 0, 0];
        return [
            Math.abs(f.flujoOperativo),
            Math.abs(f.flujoInversion),
            Math.abs(f.flujoFinanciamiento),
        ];
    });

    readonly chartOptions: ApexChart = {
        type: 'donut',
        height: 280,
        toolbar: { show: false },
    };

    readonly chartDataLabels: ApexDataLabels = { enabled: true };
    readonly chartLegend: ApexLegend = { position: 'bottom' };
    readonly chartTooltip: ApexTooltip = {
        y: { formatter: (val: number) => `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` },
    };

    readonly chartLabels = ['Actividades Operativas', 'Actividades de Inversión', 'Actividades de Financiamiento'];
    readonly chartColors = ['#d7132a', '#FB8C00', '#6b7280'];

    ngOnInit() { this.cargar(); }

    cargar() {
        this.cargando.set(true);
        this.error.set('');
        this.service.flujoEfectivo(this.anno()).subscribe({
            next: data => { this.flujo.set(data); this.cargando.set(false); },
            error: () => { this.error.set('No se pudo cargar el flujo de efectivo'); this.cargando.set(false); },
        });
    }

    cambiarAnno(a: number) {
        this.anno.set(a);
        this.cargar();
    }
}
