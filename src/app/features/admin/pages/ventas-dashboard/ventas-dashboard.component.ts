import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '@env/environment';
import { DataTableComponent, TableColumn } from '@shared/ui/tables/data-table/data-table.component';
import { ButtonComponent } from '@shared/components';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { VentasParametrosService } from '../../services/ventas-parametros.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { PageResponse } from '@core/models/pagination.model';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill,
    ApexGrid, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend
} from 'ng-apexcharts';

interface OrderSummary {
    id: number; usuarioId: number; fechaPedido: string; estado: string; total: number;
}

@Component({
    selector: 'app-ventas-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DataTableComponent, NgApexchartsModule, ButtonComponent],
    templateUrl: './ventas-dashboard.component.html',
})
export class VentasDashboardComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly parametros = inject(VentasParametrosService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    pedidos  = signal<OrderSummary[]>([]);
    cargando = signal(false);

    totalPedidos      = computed(() => this.pedidos().length);
    pedidosPendientes = computed(() => this.pedidos().filter(p => p.estado === 'PENDIENTE').length);
    pedidosPagados    = computed(() => this.pedidos().filter(p => p.estado === 'PAGADO').length);
    montoTotalMes     = computed(() => this.pedidos().reduce((s, p) => s + (p.total ?? 0), 0));
    ticketPromedio    = computed(() =>
        this.totalPedidos() > 0 ? this.montoTotalMes() / this.totalPedidos() : 0
    );
    ventasHoy = computed(() => {
        const hoy = new Date().toDateString();
        return this.pedidos()
            .filter(p => new Date(p.fechaPedido).toDateString() === hoy && p.estado !== 'CANCELADO')
            .reduce((s, p) => s + (p.total ?? 0), 0);
    });

    /* ── Chart: Ventas diarias (área) ─────────────────────────── */
    areaChart: ApexChart = this.chartDefaults.areaChart(220);
    areaSeries: ApexAxisChartSeries = [{
        name: `Ventas (${CURRENCY_DISPLAY.SYMBOL_PEN})`,
        data: [3200, 4100, 2800, 5600, 4900, 6800, 7200, 5500, 8100, 6700, 9200, 7800,
               8500, 10200, 9100, 7400, 11500, 10800, 8900, 12400, 11200, 9700, 13500, 12100, 10500, 14800, 13200, 11600]
    }];
    areaXAxis: ApexXAxis = {
        categories: Array.from({ length: 28 }, (_, i) => `${i + 1}`),
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '10px' },
                  hideOverlappingLabels: true },
        axisBorder: { show: false }, axisTicks: { show: false },
    };
    areaYAxis: ApexYAxis = this.chartDefaults.yAxis(`${CURRENCY_DISPLAY.SYMBOL_PEN} `);
    areaFill: ApexFill = this.chartDefaults.areaFill(CHART_COLORS[0]);
    areaStroke: ApexStroke = this.chartDefaults.areaStroke();
    areaGrid: ApexGrid = this.chartDefaults.grid();
    areaColors = [CHART_COLORS[0]];
    areaTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v) => `${CURRENCY_DISPLAY.SYMBOL_PEN} ${v.toLocaleString(CURRENCY_DISPLAY.LOCALE)}` } };

    /* ── Chart: Estado pedidos (donut) ────────────────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(220);
    donutSeries: ApexNonAxisChartSeries = [0, 0, 0, 0, 0];
    donutLabels = ['Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];
    donutColors = [CHART_COLORS[1], CHART_COLORS[3], CHART_COLORS[4], CHART_COLORS[2], '#ef4444'];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions('60%');
    donutLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'bottom' };
    donutDataLabels: ApexDataLabels = { enabled: false };

    columns: TableColumn<OrderSummary>[] = [
        { key: 'id', label: 'Pedido', width: '80px', render: (row) => `#${row.id}` },
        { key: 'fechaPedido', label: 'Fecha', render: (row) => row.fechaPedido
            ? new Date(row.fechaPedido).toLocaleDateString('es-PE') : '-' },
        { key: 'usuarioId', label: 'Cliente', render: (row) => `Usuario #${row.usuarioId}` },
        { key: 'total', label: 'Total', align: 'right', render: (row) => `${CURRENCY_DISPLAY.SYMBOL_PEN} ${(row.total ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true, render: (row) =>
            `<span class="badge ${this.parametros.getBadgeEstadoPedido(row.estado)}">${this.parametros.getLabelEstadoPedido(row.estado)}</span>` },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios.
     * Ver GET /api/pedidos/export en PedidoController (microshopventas).
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.sales}/api/pedidos/export`,
        filename: 'ultimos-pedidos',
    };

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        const url = `${environment.apiUrls.sales}/api/pedidos?page=0&size=50&sort=fechaPedido,desc`;
        this.http.get<PageResponse<OrderSummary>>(url).subscribe({
            next: (res) => {
                this.pedidos.set(res.content ?? []);
                this._updateDonut(res.content ?? []);
                this.cargando.set(false);
            },
            error: () => { this.pedidos.set([]); this.cargando.set(false); }
        });
    }

    /**
     * F2.4: reemplaza el donut hardcodeado [45,25,20,10] por conteos reales derivados de
     * la muestra de pedidos ya cargada (limitada a los últimos 50 — el mismo límite que ya
     * tiene el resto del dashboard). La tendencia diaria (areaSeries) requiere un endpoint
     * de agregación en el backend que hoy no existe — queda como dependencia cross-stream
     * documentada, no bloquea este quick-win.
     */
    private _updateDonut(pedidos: OrderSummary[]): void {
        const counts: Record<string, number> = { PENDIENTE: 0, PAGADO: 0, ENVIADO: 0, ENTREGADO: 0, CANCELADO: 0 };
        for (const p of pedidos) {
            if (p.estado in counts) counts[p.estado]++;
        }
        this.donutSeries = [counts['PENDIENTE'], counts['PAGADO'], counts['ENVIADO'], counts['ENTREGADO'], counts['CANCELADO']];
    }
}
