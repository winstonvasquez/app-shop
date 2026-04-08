import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService } from '../../services/periodo.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import { EstadosFinancierosService, EstadoResultados } from '../../services/estados-financieros.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill,
    ApexGrid, ApexLegend, ApexPlotOptions, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis,
    ApexNonAxisChartSeries
} from 'ng-apexcharts';

@Component({
    selector: 'app-dashboard-contabilidad',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgApexchartsModule],
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard Contable</h1>
                <p class="page-subtitle">PCGE 2020 · Marco Tributario SUNAT</p>
            </div>
            <div class="page-actions">
                <select class="input-field" style="min-width:160px">
                    <option>{{ periodoActual() }}</option>
                </select>
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid kpi-grid-4">
            <div class="kpi-card kpi-card-green">
                <div class="kpi-top">
                    <span class="kpi-label">Ingresos del Mes</span>
                    <div class="kpi-icon kpi-icon-green">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(ingresos()) }}</div>
                <div class="kpi-trend trend-up">▲ 12.4% vs mes anterior</div>
            </div>

            <div class="kpi-card kpi-card-red">
                <div class="kpi-top">
                    <span class="kpi-label">Gastos del Mes</span>
                    <div class="kpi-icon kpi-icon-red">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(gastos()) }}</div>
                <div class="kpi-trend trend-down">▼ 3.1% vs mes anterior</div>
            </div>

            <div class="kpi-card kpi-card-blue">
                <div class="kpi-top">
                    <span class="kpi-label">Utilidad Bruta</span>
                    <div class="kpi-icon kpi-icon-blue">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(utilidad()) }}</div>
                <div class="kpi-trend trend-up">▲ Margen {{ margen() }}%</div>
            </div>

            <div class="kpi-card kpi-card-yellow">
                <div class="kpi-top">
                    <span class="kpi-label">IGV por Pagar</span>
                    <div class="kpi-icon kpi-icon-yellow">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(igv()) }}</div>
                <div class="kpi-trend trend-neutral">Vence 12/03/2026</div>
            </div>
        </div>

        <!-- Charts row -->
        <div class="dash-row dash-row-2-1" style="margin-bottom:1.25rem">
            <!-- Bar: Ingresos vs Gastos 6 meses -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <span class="chart-card-title">Ingresos vs Gastos — Últimos 6 meses</span>
                </div>
                <div class="chart-card-body">
                    <apx-chart
                        [series]="barSeries"
                        [chart]="barChart"
                        [xaxis]="barXAxis"
                        [yaxis]="barYAxis"
                        [plotOptions]="barPlot"
                        [grid]="barGrid"
                        [colors]="barColors"
                        [legend]="barLegend"
                        [dataLabels]="{ enabled: false }"
                        [tooltip]="barTooltip">
                    </apx-chart>
                </div>
            </div>

            <!-- Radial: Posición IGV -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <span class="chart-card-title">Posición IGV</span>
                </div>
                <div class="chart-card-body" style="padding-top:0">
                    <apx-chart
                        [series]="radialSeries"
                        [chart]="radialChart"
                        [colors]="radialColors"
                        [plotOptions]="radialPlot"
                        [labels]="['IGV Crédito usado']"
                        [dataLabels]="{ enabled: false }">
                    </apx-chart>
                    <div style="display:flex;flex-direction:column;gap:0.625rem;padding:0 1rem 1rem">
                        <div class="stat-row">
                            <span class="stat-row-label">IGV Ventas (débito)</span>
                            <span class="stat-row-value">{{ formatoMonto(igvDebito()) }}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-row-label">IGV Compras (crédito)</span>
                            <span class="stat-row-value" style="color:var(--color-success)">{{ formatoMonto(igvCredito()) }}</span>
                        </div>
                        <div class="stat-row" style="font-weight:700">
                            <span class="stat-row-label">IGV Neto a pagar</span>
                            <span class="stat-row-value" style="color:var(--color-warning)">{{ formatoMonto(igv()) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Calendario tributario -->
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Calendario Tributario</h2>
            </div>
            <div class="overflow-x-auto">
                <table class="table">
                    <thead class="table-header">
                        <tr>
                            <th class="table-header-cell">Obligación</th>
                            <th class="table-header-cell">Período</th>
                            <th class="table-header-cell text-right">Monto</th>
                            <th class="table-header-cell">Vencimiento</th>
                            <th class="table-header-cell">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="table-row">
                            <td class="table-cell font-medium">IGV (PDT 621)</td>
                            <td class="table-cell text-subtle">Marzo 2026</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(igv()) }}</td>
                            <td class="table-cell" style="color:var(--color-warning)">12/03/2026</td>
                            <td class="table-cell"><span class="badge badge-warning">Pendiente</span></td>
                        </tr>
                        <tr class="table-row">
                            <td class="table-cell font-medium">Renta — RMT (1.5%)</td>
                            <td class="table-cell text-subtle">Marzo 2026</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(renta()) }}</td>
                            <td class="table-cell" style="color:var(--color-warning)">12/03/2026</td>
                            <td class="table-cell"><span class="badge badge-warning">Pendiente</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `
})
export class DashboardContabilidadComponent implements OnInit {
    private readonly asientoService = inject(AsientoService);
    private readonly periodoService = inject(PeriodoService);
    private readonly chartDefaults = inject(ChartDefaultsService);
    private readonly estadosService = inject(EstadosFinancierosService);

    periodoActual = signal('Cargando...');
    readonly anno = signal(new Date().getFullYear());
    readonly estadoResultados = signal<EstadoResultados | null>(null);
    readonly cargandoDashboard = signal(false);

    readonly ingresos = computed(() =>
        this.estadoResultados()?.ingresos.reduce((sum, l) => sum + l.monto, 0) ?? 0
    );
    readonly gastos = computed(() =>
        this.estadoResultados()?.gastos.reduce((sum, l) => sum + l.monto, 0) ?? 0
    );
    readonly utilidad = computed(() => this.estadoResultados()?.utilidadNeta ?? 0);
    igv       = signal(0);
    igvDebito = signal(0);
    igvCredito = signal(0);
    renta     = signal(0);

    margen = () => {
        const ing = this.ingresos();
        if (ing === 0) return 0;
        const util = this.utilidad();
        if (!isFinite(util / ing)) return 0;
        return ((util / ing) * 100).toFixed(1);
    };

    formatoMonto = (monto: number): string =>
        'S/ ' + monto.toLocaleString('es-PE', { minimumFractionDigits: 0 });

    /* ── Chart: Bar ingresos vs gastos ────────────────────────── */
    barChart: ApexChart = this.chartDefaults.barChart(false, 260);
    barSeries: ApexAxisChartSeries = [
        { name: 'Ingresos', data: [112000, 125000, 138000, 130000, 142000, 147999] as number[] },
        { name: 'Gastos',   data: [78000,  82000,  75000,  88000,  79000,  82400] as number[] }
    ];
    barXAxis: ApexXAxis = this.chartDefaults.xAxis(this.chartDefaults.last6MonthLabels());
    barYAxis: ApexYAxis = this.chartDefaults.yAxis('S/ ');
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(false, 6, '65%');
    barGrid: ApexGrid = this.chartDefaults.grid();
    barColors = [CHART_COLORS[2], CHART_COLORS[0]];
    barLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'top' };
    barTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => 'S/ ' + v.toLocaleString('es-PE') } };

    /* ── Chart: Radial IGV ────────────────────────────────────── */
    radialChart: ApexChart = this.chartDefaults.radialChart(180);
    radialSeries: ApexNonAxisChartSeries = [56]; /* igvCredito / igvDebito * 100 */
    radialColors = [CHART_COLORS[2]];
    radialPlot: ApexPlotOptions = this.chartDefaults.radialPlotOptions(CHART_COLORS[2]);

    ngOnInit() { this._cargarDatos(); }

    private _cargarDatos() {
        this.periodoService.actual().subscribe({
            next: (periodo) => this.periodoActual.set(periodo.nombre),
            error: () => this.periodoService.listar().subscribe({
                next: (lista) => {
                    const abierto = lista.find(p => p.estado === 'ABIERTO');
                    if (abierto) this.periodoActual.set(abierto.nombre);
                },
                error: () => this.periodoActual.set('Sin periodo activo')
            })
        });

        this.cargandoDashboard.set(true);
        this.estadosService.estadoResultados(this.anno()).subscribe({
            next: data => {
                this.estadoResultados.set(data);
                this.cargandoDashboard.set(false);
            },
            error: () => this.cargandoDashboard.set(false),
        });
    }
}
