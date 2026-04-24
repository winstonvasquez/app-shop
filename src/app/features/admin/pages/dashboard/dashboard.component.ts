import { Component, signal, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill,
    ApexGrid, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ApexNonAxisChartSeries, ApexLegend, ApexPlotOptions
} from 'ng-apexcharts';

interface MetricCard {
    label: string;
    value: string;
    change: string;
    isPositive: boolean;
    iconColor: 'red' | 'orange' | 'green' | 'blue';
    iconSvg: string;
}

interface Order {
    id: string;
    customer: string;
    product: string;
    date: string;
    total: string;
    status: 'success' | 'pending' | 'cancelled';
    statusLabel: string;
}

interface Product {
    name: string;
    category: string;
    sales: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [TranslateModule, NgApexchartsModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
    private readonly translate = inject(TranslateService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    /* ── KPI Metrics ──────────────────────────────────────────── */
    metrics = signal<MetricCard[]>([]);

    /* ── Chart: Ventas del mes (área) ─────────────────────────── */
    areaChart: ApexChart = this.chartDefaults.areaChart(280);
    areaSeries: ApexAxisChartSeries = [{
        name: 'Ventas',
        data: [4200, 5800, 3900, 7200, 6100, 8400, 5700, 9200, 7800, 8900, 11200, 9800,
               7400, 12100, 10300, 8700, 13500, 11800, 9600, 14200, 12400, 10900, 15600, 13200,
               11500, 16800, 14700, 12600, 17900, 15800]
    }];
    areaXAxis: ApexXAxis = {
        categories: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '10px' },
                  rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false }, axisTicks: { show: false },
    };
    areaYAxis: ApexYAxis = this.chartDefaults.yAxis('S/ ', 0);
    areaFill: ApexFill = this.chartDefaults.areaFill();
    areaStroke: ApexStroke = this.chartDefaults.areaStroke();
    areaGrid: ApexGrid = this.chartDefaults.grid();
    areaTooltip: ApexTooltip = {
        theme: 'dark',
        y: { formatter: (val) => `S/ ${val.toLocaleString('es-PE')}` }
    };
    areaColors = [CHART_COLORS[0]];

    /* ── Chart: Top categorías (donut) ────────────────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(240);
    donutSeries: ApexNonAxisChartSeries = [38, 27, 19, 16];
    donutLabels = ['Electrónica', 'Computadoras', 'Audio', 'Wearables'];
    donutColors = [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3]];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions();
    donutLegend: ApexLegend = {
        ...this.chartDefaults.legend(),
        position: 'bottom',
        horizontalAlign: 'center',
    };
    donutDataLabels: ApexDataLabels = { enabled: false };

    /* ── Pedidos recientes ─────────────────────────────────────── */
    recentOrders = signal<Order[]>([
        { id: '#ORD-1234', customer: 'Juan Pérez',     product: 'Smartphone XYZ', date: '12 Feb 2026', total: 'S/ 899',   status: 'success',   statusLabel: '' },
        { id: '#ORD-1233', customer: 'María García',   product: 'Laptop Pro 15"', date: '12 Feb 2026', total: 'S/ 1,299', status: 'pending',   statusLabel: '' },
        { id: '#ORD-1232', customer: 'Carlos López',   product: 'Auriculares BT', date: '11 Feb 2026', total: 'S/ 199',   status: 'success',   statusLabel: '' },
        { id: '#ORD-1231', customer: 'Ana Martínez',   product: 'Smartwatch Pro', date: '11 Feb 2026', total: 'S/ 349',   status: 'cancelled', statusLabel: '' },
        { id: '#ORD-1230', customer: 'Pedro Sánchez',  product: 'Tablet 10"',     date: '10 Feb 2026', total: 'S/ 499',   status: 'success',   statusLabel: '' },
    ]);

    topProducts = signal<Product[]>([
        { name: 'Smartphone XYZ', category: 'Electrónica',  sales: 'S/ 12,450' },
        { name: 'Laptop Pro 15"', category: 'Computadoras', sales: 'S/ 9,800'  },
        { name: 'Auriculares BT', category: 'Audio',         sales: 'S/ 7,230'  },
        { name: 'Smartwatch Pro', category: 'Wearables',     sales: 'S/ 5,670'  },
    ]);

    readonly productColors = [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3]];

    ngOnInit(): void {
        this.metrics.set([
            {
                label: 'Ventas Totales',
                value: 'S/ 45,230',
                change: '+12.5% vs mes anterior',
                isPositive: true,
                iconColor: 'red',
                iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            },
            {
                label: 'Pedidos Activos',
                value: '1,234',
                change: '+8.2% vs mes anterior',
                isPositive: true,
                iconColor: 'orange',
                iconSvg: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
            },
            {
                label: 'Productos en Stock',
                value: '567',
                change: '+15 nuevos productos',
                isPositive: true,
                iconColor: 'green',
                iconSvg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
            },
            {
                label: 'Clientes Activos',
                value: '890',
                change: '+23 nuevos clientes',
                isPositive: true,
                iconColor: 'blue',
                iconSvg: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
            }
        ]);

        this.recentOrders.update(orders => orders.map(o => ({
            ...o,
            statusLabel: this.translate.instant(`admin.dashboard.estadoPedido.${o.status}`)
        })));
    }
}
