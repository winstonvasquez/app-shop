import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LogisticsDashboardService } from '../../services/logistics-dashboard.service';
import { LogisticsKpi, CarrierKpi } from '../../models/logistics-dashboard.model';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend, ApexTooltip, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

/**
 * Landing de Logística — fulfillment/transporte (últimos 30 días), SIEMPRE actualizado.
 * Antes mostraba almacenes/movimientos (dominio WMS, ya migrado a Inventario) — corregido
 * para reflejar el propio comentario del sidebar: "Logística = fulfillment + transporte,
 * NO duplica el dominio WMS". Complementa a KpiDashboardComponent (consulta puntual con
 * rango de fechas a demanda, en /admin/logistica/kpi) — este es el resumen siempre-vigente.
 */
@Component({
    selector: 'app-dashboard-logistica',
    standalone: true,
    imports: [RouterModule, NgApexchartsModule],
    templateUrl: './dashboard-logistica.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLogisticaComponent implements OnInit {
    private readonly dashboardService = inject(LogisticsDashboardService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    loading = signal(false);
    error = signal<string | null>(null);
    kpi = signal<LogisticsKpi | null>(null);

    readonly fulfillmentRatePct = computed(() => {
        const k = this.kpi();
        return k ? (k.fulfillmentRate * 100).toFixed(1) : '0.0';
    });

    readonly returnRatePct = computed(() => {
        const k = this.kpi();
        return k ? (k.returnRate * 100).toFixed(1) : '0.0';
    });

    readonly carriers = computed<CarrierKpi[]>(() => this.kpi()?.byCarrier ?? []);

    /* ── Chart: Bar — envíos entregados por transportista ────── */
    barChart: ApexChart = this.chartDefaults.barChart(true, 260);
    barSeries: ApexAxisChartSeries = [{ name: 'Entregados', data: [] }];
    barXAxis: ApexXAxis = {
        categories: [],
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '12px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
    };
    barYAxis: ApexYAxis = { labels: { style: { colors: this.chartDefaults.textColor } } };
    barTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => v + ' envíos' } };
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(true, 6);
    barGrid: ApexGrid = this.chartDefaults.grid(3);
    barColors = [CHART_COLORS[0]];
    barDataLabels: ApexDataLabels = {
        enabled: true,
        style: { colors: ['oklch(0.96 0 0)'], fontSize: '11px' },
        offsetX: -6,
    };

    /* ── Chart: Donut — estado de envíos ─────────────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(200);
    donutSeries: ApexNonAxisChartSeries = [0, 0, 0];
    donutLabels = ['Entregados', 'Pendientes', 'Devueltos'];
    donutColors = [CHART_COLORS[2], CHART_COLORS[1], CHART_COLORS[6]];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions('60%');
    donutLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'bottom' };

    ngOnInit(): void {
        this.loadKpis();
    }

    loadKpis(): void {
        this.loading.set(true);
        this.error.set(null);
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 30);
        this.dashboardService.getKpis(this.toIsoDate(from), this.toIsoDate(to)).subscribe({
            next: (data) => {
                this.kpi.set(data);
                this._updateBarChart(data.byCarrier);
                this._updateDonut(data);
                this.loading.set(false);
            },
            error: () => { this.error.set('No se pudieron cargar los KPIs de logística.'); this.loading.set(false); }
        });
    }

    private toIsoDate(d: Date): string {
        return d.toISOString().substring(0, 10);
    }

    private _updateBarChart(byCarrier: CarrierKpi[]): void {
        this.barSeries = [{ name: 'Entregados', data: byCarrier.map(c => c.deliveredCount) }];
        this.barXAxis = { ...this.barXAxis, categories: byCarrier.map(c => c.carrierName.slice(0, 18)) };
    }

    private _updateDonut(k: LogisticsKpi): void {
        this.donutSeries = [k.deliveredShipments, k.pendingShipments, k.returnedShipments];
    }

    onTimeRateClass(rate: number): string {
        if (rate >= 0.9) return 'text-success';
        if (rate >= 0.75) return 'text-warning';
        return 'text-error';
    }
}
