import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { InventoryApiService, DashboardSummary } from '../../services/inventory-api.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexFill, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend,
    ApexStroke, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

@Component({
    selector: 'app-inventory-dashboard',
    standalone: true,
    imports: [DatePipe, NgApexchartsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard de Inventario</h1>
                <p class="page-subtitle">Resumen general de stock y movimientos recientes.</p>
            </div>
        </div>

        @if (loading()) {
            <div class="loading-container"><div class="spinner"></div></div>
        }

        @if (error()) {
            <div class="card" style="border-left:3px solid var(--color-error);padding:1rem;margin-bottom:1.25rem">
                <p class="text-subtle">{{ error() }}</p>
            </div>
        }

        <!-- KPI Cards -->
        <div class="kpi-grid kpi-grid-4">
            <div class="kpi-card kpi-card-blue">
                <div class="kpi-top">
                    <span class="kpi-label">Stock Total</span>
                    <div class="kpi-icon kpi-icon-blue">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.totalStock ?? 0 }}</div>
                <div class="kpi-sub">unidades totales</div>
            </div>

            <div class="kpi-card kpi-card-yellow">
                <div class="kpi-top">
                    <span class="kpi-label">Bajo Stock</span>
                    <div class="kpi-icon kpi-icon-yellow">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.lowStockProducts ?? 0 }}</div>
                <div class="kpi-sub">productos a reponer</div>
            </div>

            <div class="kpi-card kpi-card-orange">
                <div class="kpi-top">
                    <span class="kpi-label">Transferencias</span>
                    <div class="kpi-icon kpi-icon-orange">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.pendingTransfers ?? 0 }}</div>
                <div class="kpi-sub">pendientes</div>
            </div>

            <div class="kpi-card kpi-card-red">
                <div class="kpi-top">
                    <span class="kpi-label">Movimientos 7d</span>
                    <div class="kpi-icon kpi-icon-red">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ recentMovements().length }}</div>
                <div class="kpi-sub">registros</div>
            </div>
        </div>

        @if (summary()) {
            <!-- Charts row -->
            <div class="dash-row dash-row-2-1">
                <!-- Área: Tendencia semanal -->
                <div class="chart-card">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Tendencia Semanal de Movimientos</span>
                        <span style="font-size:0.75rem;color:var(--color-text-muted)">{{ recentMovements().length }} movimientos</span>
                    </div>
                    <div class="chart-card-body">
                        <apx-chart
                            [series]="areaSeries"
                            [chart]="areaChart"
                            [xaxis]="areaXAxis"
                            [yaxis]="areaYAxis"
                            [fill]="areaFill"
                            [stroke]="areaStroke"
                            [grid]="areaGrid"
                            [colors]="areaColors"
                            [dataLabels]="{ enabled: false }"
                            [tooltip]="{ theme: 'dark', y: { formatter: v => v + ' movimientos' } }">
                        </apx-chart>
                    </div>
                </div>

                <!-- Últimos movimientos list -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Últimos Movimientos</span>
                        <span class="text-subtle" style="font-size:0.75rem">{{ recentMovements().length }} registros</span>
                    </div>
                    <div class="card-body" style="padding-top:0.5rem">
                        @for (movement of recentMovements(); track movement.id) {
                            <div class="mov-item">
                                <div class="mov-icon"
                                    [style.background]="movement.movementType === 'ENTRADA' ? 'color-mix(in oklch, var(--color-success) 15%, transparent)' : 'color-mix(in oklch, var(--color-warning) 15%, transparent)'"
                                    [style.color]="movement.movementType === 'ENTRADA' ? 'var(--color-success)' : 'var(--color-warning)'">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        @if (movement.movementType === 'ENTRADA') {
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                                        } @else {
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
                                        }
                                    </svg>
                                </div>
                                <div class="mov-info">
                                    <div class="mov-title">{{ movement.productName || movement.productId }}</div>
                                    <div class="mov-sub">{{ movement.warehouseName }} · {{ movement.quantity }} uds</div>
                                </div>
                                <span class="mov-date">{{ movement.movementDate || movement.createdAt | date:'dd/MM' }}</span>
                            </div>
                        } @empty {
                            <div class="text-center text-subtle" style="padding:var(--space-xl)">Sin movimientos</div>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class InventoryDashboardComponent {
    private readonly api = inject(InventoryApiService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    summary = signal<DashboardSummary | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);

    recentMovements = computed(() => this.summary()?.recentMovements ?? []);

    /* ── Chart: Área — tendencia semanal ──────────────────────── */
    areaChart: ApexChart = this.chartDefaults.areaChart(240);
    areaFill: ApexFill = this.chartDefaults.areaFill(CHART_COLORS[0]);
    areaStroke: ApexStroke = this.chartDefaults.areaStroke();
    areaGrid: ApexGrid = this.chartDefaults.grid();
    areaColors = [CHART_COLORS[0]];

    areaSeries = computed<ApexAxisChartSeries>(() => {
        const now = new Date();
        const movements = this.recentMovements();
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - (6 - i));
            return movements.filter(m => {
                const md = new Date(m.movementDate || m.createdAt);
                return md.toDateString() === d.toDateString();
            }).length;
        });
        return [{ name: 'Movimientos', data: days }];
    });

    areaXAxis = computed<ApexXAxis>(() => ({
        categories: this.chartDefaults.last7DayLabels(),
        labels: { style: { colors: this.chartDefaults.textColor, fontSize: '12px' } },
        axisBorder: { show: false }, axisTicks: { show: false },
    }));

    areaYAxis: ApexYAxis = {
        labels: { style: { colors: this.chartDefaults.textColor }, formatter: (v) => String(Math.round(v)) }
    };

    constructor() { this.loadSummary(); }

    private loadSummary(): void {
        this.loading.set(true);
        this.error.set(null);
        this.api.getDashboardSummary().subscribe({
            next: (response) => { this.summary.set(response); this.loading.set(false); },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }
}
