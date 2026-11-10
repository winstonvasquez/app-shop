import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AsientoService } from '../../services/asiento.service';
import { PeriodoService } from '../../services/periodo.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import { EstadosFinancierosService, EstadoResultados } from '../../services/estados-financieros.service';
import { DeclaracionIgvService, PDT621 } from '../../services/declaracion-igv.service';
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
                    <span class="kpi-label">Ingresos del Año</span>
                    <div class="kpi-icon kpi-icon-green">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(ingresos()) }}</div>
            </div>

            <div class="kpi-card kpi-card-red">
                <div class="kpi-top">
                    <span class="kpi-label">Gastos del Año</span>
                    <div class="kpi-icon kpi-icon-red">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 17H5m0 0V9m0 8l8-8 4 4 6-6"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(gastos()) }}</div>
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
                <div class="kpi-value" style="font-size:1.5rem">{{ formatoMonto(utilidadBruta()) }}</div>
                <div class="kpi-trend trend-neutral">Margen bruto {{ margen() }}%</div>
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
                <div class="kpi-trend trend-neutral">{{ pdt()?.fechaVencimiento ? 'Vence ' + pdt()?.fechaVencimiento : 'Sin cálculo del periodo' }}</div>
            </div>
        </div>

        <!-- Charts row -->
        <div class="dash-row dash-row-2-1" style="margin-bottom:1.25rem">
            <!-- Bar: Ingresos vs Gastos 6 meses -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <span class="chart-card-title">Ingresos vs Gastos — {{ anno() }}</span>
                </div>
                <div class="chart-card-body">
                    <apx-chart
                        [series]="barSeries()"
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
                        [series]="radialSeries()"
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
                            <td class="table-cell text-subtle">{{ periodoActual() }}</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(igv()) }}</td>
                            <td class="table-cell" style="color:var(--color-warning)">{{ pdt()?.fechaVencimiento ?? '—' }}</td>
                            <td class="table-cell"><span class="badge badge-warning">{{ pdt()?.estado ?? 'Sin calcular' }}</span></td>
                        </tr>
                        <tr class="table-row">
                            <td class="table-cell font-medium">Renta — RMT (1.5%)</td>
                            <td class="table-cell text-subtle">{{ periodoActual() }}</td>
                            <td class="table-cell text-right font-mono">{{ formatoMonto(renta()) }}</td>
                            <td class="table-cell" style="color:var(--color-warning)">{{ pdt()?.fechaVencimiento ?? '—' }}</td>
                            <td class="table-cell"><span class="badge badge-warning">{{ pdt()?.estado ?? 'Sin calcular' }}</span></td>
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
    private readonly igvService = inject(DeclaracionIgvService);

    readonly periodoActual = signal('Cargando...');
    readonly anno = signal(new Date().getFullYear());
    readonly estadoResultados = signal<EstadoResultados | null>(null);
    readonly cargandoDashboard = signal(false);

    readonly ingresos = computed(() => this.estadoResultados()?.totalIngresos ?? 0);
    readonly gastos = computed(() => this.estadoResultados()?.totalGastos ?? 0);
    readonly utilidadBruta = computed(() => this.estadoResultados()?.utilidadBruta ?? 0);

    /** PDT 621 calculado (sin persistir) del periodo actual; null si no hay periodo o el rol no puede calcular. */
    readonly pdt = signal<PDT621 | null>(null);
    readonly igv = computed(() => this.pdt()?.igvNeto ?? 0);
    readonly igvDebito = computed(() => this.pdt()?.igvVentas ?? 0);
    readonly igvCredito = computed(() => this.pdt()?.igvCompras ?? 0);
    readonly renta = computed(() => this.pdt()?.rentaMensual ?? 0);

    readonly margen = computed(() => {
        const ing = this.ingresos();
        return ing === 0 ? '0.0' : ((this.utilidadBruta() / ing) * 100).toFixed(1);
    });

    formatoMonto = (monto: number): string =>
        'S/ ' + monto.toLocaleString('es-PE', { minimumFractionDigits: 0 });

    /* ── Chart: Bar ingresos vs gastos ────────────────────────── */
    barChart: ApexChart = this.chartDefaults.barChart(false, 260);
    // Totales reales del año (estado de resultados); no hay serie mensual en el backend.
    readonly barSeries = computed<ApexAxisChartSeries>(() => [
        { name: 'Ingresos', data: [this.ingresos()] },
        { name: 'Gastos',   data: [this.gastos()] }
    ]);
    barXAxis: ApexXAxis = this.chartDefaults.xAxis([String(this.anno())]);
    barYAxis: ApexYAxis = this.chartDefaults.yAxis('S/ ');
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(false, 6, '65%');
    barGrid: ApexGrid = this.chartDefaults.grid();
    barColors = [CHART_COLORS[2], CHART_COLORS[0]];
    barLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'top' };
    barTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => 'S/ ' + v.toLocaleString('es-PE') } };

    /* ── Chart: Radial IGV ────────────────────────────────────── */
    radialChart: ApexChart = this.chartDefaults.radialChart(180);
    readonly radialSeries = computed<ApexNonAxisChartSeries>(() => {
        const deb = this.igvDebito();
        return [deb > 0 ? Math.min(100, Math.round((this.igvCredito() / deb) * 100)) : 0];
    });
    radialColors = [CHART_COLORS[2]];
    radialPlot: ApexPlotOptions = this.chartDefaults.radialPlotOptions(CHART_COLORS[2]);

    ngOnInit() { this._cargarDatos(); }

    private _cargarPeriodo() {
        this.periodoService.actual().subscribe({
            next: (periodo) => { this.periodoActual.set(periodo.nombre); this._cargarIgv(periodo.id); },
            error: () => this._cargarPeriodoFallback()
        });
    }

    private _cargarPeriodoFallback() {
        this.periodoService.listar().subscribe({
            next: (lista) => {
                const abierto = lista.find(p => p.estado === 'ABIERTO');
                if (abierto) { this.periodoActual.set(abierto.nombre); this._cargarIgv(abierto.id); }
                else this.periodoActual.set('Sin periodo activo');
            },
            error: () => this.periodoActual.set('Sin periodo activo')
        });
    }

    private _cargarIgv(periodoId: string) {
        // Los valores de renta no afectan al IGV; se usa el régimen por defecto de la pantalla de declaración.
        this.igvService.calcular({ periodoId, regimenRenta: 'RMT', coeficienteRenta: 0.015 }).subscribe({
            next: pdt => this.pdt.set(pdt),
            error: () => this.pdt.set(null),
        });
    }

    private _cargarDatos() {
        this._cargarPeriodo();

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
