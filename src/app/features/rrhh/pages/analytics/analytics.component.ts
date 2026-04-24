import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AnalyticsService, HrAnalytics } from '../../services/analytics.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexNonAxisChartSeries,
    ApexPlotOptions, ApexDataLabels, ApexLegend, ApexXAxis, ApexYAxis, ApexGrid, ApexTooltip
} from 'ng-apexcharts';

@Component({
    selector: 'app-rrhh-analytics',
    standalone: true,
    imports: [NgApexchartsModule, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
    private readonly analyticsService = inject(AnalyticsService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    readonly data = this.analyticsService.analytics;
    readonly loading = this.analyticsService.loading;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH', url: '/admin/rrhh/dashboard' },
        { label: 'Analytics' },
    ];

    // Donut — Headcount por departamento
    donutChart: ApexChart = this.chartDefaults.donutChart(280);
    donutSeries: ApexNonAxisChartSeries = [];
    donutLabels: string[] = [];
    donutColors: string[] = CHART_COLORS;
    donutLegend: ApexLegend = { position: 'bottom', labels: { colors: this.chartDefaults.textColor } };
    donutDataLabels: ApexDataLabels = { enabled: true, style: { colors: ['#fff'] } };

    // Bar — KPIs
    barChart: ApexChart = this.chartDefaults.barChart(false, 280);
    barSeries: ApexAxisChartSeries = [];
    barXAxis: ApexXAxis = this.chartDefaults.xAxis([]);
    barYAxis: ApexYAxis = { labels: { style: { colors: this.chartDefaults.textColor } } };
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(false, 10, '50%');
    barGrid: ApexGrid = this.chartDefaults.grid(3);
    barDataLabels: ApexDataLabels = { enabled: false };
    barTooltip: ApexTooltip = { theme: 'dark' };

    async ngOnInit(): Promise<void> {
        await this.analyticsService.loadDashboard();
        const d = this.data();
        if (d) {
            // Donut
            this.donutLabels = Object.keys(d.headcountByDepartment);
            this.donutSeries = Object.values(d.headcountByDepartment);

            // Bar — summary metrics
            this.barSeries = [{
                name: 'Cantidad',
                data: [
                    d.activeContracts,
                    d.expiringContracts30Days,
                    d.pendingVacationRequests,
                    d.pendingEvaluations,
                    d.completedEvaluations,
                    d.activeGoals,
                    d.completedGoals,
                ]
            }];
            this.barXAxis = this.chartDefaults.xAxis([
                'Contratos Activos', 'Por Vencer', 'Vac. Pendientes',
                'Eval. Pendientes', 'Eval. Completadas', 'Metas Activas', 'Metas Completadas'
            ]);
        }
    }
}
