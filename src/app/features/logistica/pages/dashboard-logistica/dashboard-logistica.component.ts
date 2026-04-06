import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen } from '../../models/almacen.model';
import { MovimientoService } from '../../services/movimiento.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend, ApexTooltip, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

@Component({
    selector: 'app-dashboard-logistica',
    standalone: true,
    imports: [RouterModule, NgApexchartsModule],
    templateUrl: './dashboard-logistica.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLogisticaComponent implements OnInit {
    private almacenService = inject(AlmacenService);
    private movimientoService = inject(MovimientoService);
    private authService = inject(AuthService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    almacenes = signal<Almacen[]>([]);
    ultimosMovimientos = signal<any[]>([]);
    totalItems = signal(0);
    movimientosHoy = signal(0);
    movimientosPendientes = signal(0);
    stockBajo = signal(0);

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    /* ── Chart: Bar — stock por almacén ──────────────────────── */
    barChart: ApexChart = this.chartDefaults.barChart(true, 260);
    barSeries: ApexAxisChartSeries = [{ name: 'Stock', data: [] }];
    barXAxis: ApexXAxis = {
        categories: [],
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '12px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
    };
    barYAxis: ApexYAxis = { labels: { style: { colors: this.chartDefaults.textColor } } };
    barTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => v + ' items' } };
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(true, 6);
    barGrid: ApexGrid = this.chartDefaults.grid(3);
    barColors = [CHART_COLORS[0]];
    barDataLabels: ApexDataLabels = {
        enabled: true,
        style: { colors: ['oklch(0.96 0 0)'], fontSize: '11px' },
        offsetX: -6,
    };

    /* ── Chart: Donut — estado almacenes ─────────────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(200);
    donutSeries: ApexNonAxisChartSeries = [0, 0, 0];
    donutLabels = ['Activo', 'Mantenimiento', 'Inactivo'];
    donutColors = [CHART_COLORS[2], CHART_COLORS[1], CHART_COLORS[6]];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions('60%');
    donutLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'bottom' };

    ngOnInit() {
        this.loadAlmacenes();
        this.loadMovimientos();
    }

    loadAlmacenes() {
        this.almacenService.getAlmacenes(this.companyId, { size: 10 }).subscribe({
            next: (res) => {
                this.almacenes.set(res.content);
                const total = res.content.reduce((sum, a) => sum + (a.totalItems || 0), 0);
                this.totalItems.set(total);
                this._updateBarChart(res.content);
                this._updateDonut(res.content);
            },
            error: () => this.almacenes.set([])
        });
    }

    loadMovimientos() {
        this.movimientoService.getMovimientos(this.companyId, { size: 5 }).subscribe({
            next: (res: any) => {
                this.ultimosMovimientos.set(res.content || []);
                this.movimientosHoy.set(res.totalElements || 0);
            },
            error: () => this.ultimosMovimientos.set([])
        });
    }

    private _updateBarChart(almacenes: Almacen[]): void {
        this.barSeries = [{ name: 'Items en stock', data: almacenes.map(a => a.totalItems || 0) }];
        this.barXAxis = {
            ...this.barXAxis,
            categories: almacenes.map(a => a.nombre.slice(0, 18)),
        };
    }

    private _updateDonut(almacenes: Almacen[]): void {
        this.donutSeries = [
            almacenes.filter(a => a.estado === 'ACTIVO').length,
            almacenes.filter(a => a.estado === 'MANTENIMIENTO').length,
            almacenes.filter(a => a.estado !== 'ACTIVO' && a.estado !== 'MANTENIMIENTO').length,
        ];
    }

    getStockPercent(almacen: Almacen): number {
        const total = this.totalItems();
        if (total === 0) return 0;
        return ((almacen.totalItems || 0) / total) * 100;
    }

    getTipoIcon(tipo: string): string {
        if (tipo?.startsWith('ENTRADA')) return '📥';
        if (tipo?.startsWith('SALIDA')) return '📤';
        if (tipo === 'TRASLADO') return '🔄';
        return '📦';
    }

    formatTipo(tipo: string): string { return tipo?.replace(/_/g, ' ') || ''; }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
    }
}
