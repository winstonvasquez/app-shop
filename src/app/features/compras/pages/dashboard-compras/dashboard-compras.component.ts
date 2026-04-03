import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardService, DashboardCompras } from '../../services/dashboard.service';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend, ApexTooltip, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

@Component({
    selector: 'app-dashboard-compras',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, PageHeaderComponent, NgApexchartsModule],
    templateUrl: './dashboard-compras.component.html'
})
export class DashboardComprasComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    dashboard = signal<DashboardCompras | null>(null);
    loading = signal(false);
    readonly Math = Math;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras' }
    ];

    get currentMonth(): string {
        const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
    }

    /* ── Chart: Top Proveedores (bar horizontal) ──────────────── */
    barChart: ApexChart = { ...this.chartDefaults.barChart(true, 240), type: 'bar' };
    barSeries: ApexAxisChartSeries = [{ name: 'Monto (S/)', data: [45200, 38700, 29400, 22800, 18100] }];
    barXAxis: ApexXAxis = {
        categories: ['Prov. A', 'Prov. B', 'Prov. C', 'Prov. D', 'Prov. E'],
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '12px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
    };
    barYAxis: ApexYAxis = { labels: { style: { colors: this.chartDefaults.textColor } } };
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(true, 6);
    barGrid: ApexGrid = this.chartDefaults.grid(3);
    barColors = [CHART_COLORS[0]];
    barDataLabels: ApexDataLabels = {
        enabled: true,
        formatter: (val) => `S/ ${Number(val).toLocaleString('es-PE')}`,
        style: { colors: ['oklch(0.96 0 0)'], fontSize: '11px' },
        offsetX: -8,
    };

    /* ── Chart: Estado OC (donut) ─────────────────────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(220);
    donutSeries: ApexNonAxisChartSeries = [0, 0, 0, 0];
    donutLabels = ['Borradores', 'Pendientes', 'Aprobadas', 'Recibidas'];
    donutColors = [CHART_COLORS[6], CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3]];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions('60%');
    donutLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'bottom' };
    donutDataLabels: ApexDataLabels = { enabled: false };
    donutTooltip: ApexTooltip = { theme: 'dark' };

    ngOnInit(): void { this.loadDashboard(); }

    loadDashboard(): void {
        this.loading.set(true);
        this.dashboardService.getDashboardCompras().subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.loading.set(false);
                this._updateCharts(data);
            },
            error: () => {
                const empty: DashboardCompras = {
                    totalComprasMes: 0, ocEmitidas: 0, ocPendientes: 0,
                    ocAprobadas: 0, ocRecibidas: 0, totalProveedores: 0,
                    proveedoresNuevos: 0, comprasTrimestre: 0,
                    topProveedores: [], ultimasOC: []
                };
                this.dashboard.set(empty);
                this.loading.set(false);
            }
        });
    }

    private _updateCharts(data: DashboardCompras): void {
        if (data.topProveedores?.length) {
            this.barSeries = [{ name: 'Monto (S/)', data: data.topProveedores.slice(0, 5).map(p => p.monto) }];
            this.barXAxis = {
                ...this.barXAxis,
                categories: data.topProveedores.slice(0, 5).map(p => p.nombre.slice(0, 18)),
            };
        }
        const borradores = (data.ocEmitidas ?? 0) - (data.ocAprobadas ?? 0) - (data.ocPendientes ?? 0);
        this.donutSeries = [
            Math.max(0, borradores),
            data.ocPendientes ?? 0,
            data.ocAprobadas ?? 0,
            data.ocRecibidas ?? 0,
        ];
    }

    badgeEstado(estado: string): string {
        const map: Record<string, string> = {
            APROBADA: 'success', PENDIENTE: 'warning', RECIBIDA: 'success',
            BORRADOR: 'neutral', ENVIADA: 'accent', CANCELADA: 'error'
        };
        return map[estado] ?? 'neutral';
    }
}
