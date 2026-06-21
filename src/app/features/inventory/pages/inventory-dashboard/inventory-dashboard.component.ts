import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { InventoryApiService, DashboardSummary } from '../../services/inventory-api.service';
import { InventoryMovement } from '../../models/inventory.models';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import {
    ApexAxisChartSeries, ApexChart, ApexFill, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend,
    ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

@Component({
    selector: 'app-inventory-dashboard',
    standalone: true,
    imports: [DatePipe, NgApexchartsModule, PageHeaderComponent, AlertComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-container">
        <app-page-header
            title="Dashboard de Inventario"
            subtitle="Resumen general de stock y movimientos recientes."
            [breadcrumbs]="breadcrumbs">
        </app-page-header>

        @if (loading()) {
            <div class="loading-container"><div class="spinner"></div></div>
        }

        @if (error()) {
            <app-alert type="error" [message]="error()!" [dismissible]="true" (dismiss)="error.set(null)" />
        }

        <!-- KPI Cards -->
        <div class="kpi-grid kpi-grid-5">
            <div class="kpi-card kpi-card-blue">
                <div class="kpi-top">
                    <span class="kpi-label">Almacenes activos</span>
                    <div class="kpi-icon kpi-icon-blue">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h2m-2 4h2m-2 4h2m4-8h2m-2 4h2m-2 4h2"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.almacenesActivos ?? 0 }}</div>
                <div class="kpi-sub">de {{ summary()?.totalAlmacenes ?? 0 }} totales</div>
            </div>

            <div class="kpi-card kpi-card-yellow">
                <div class="kpi-top">
                    <span class="kpi-label">Stock bajo</span>
                    <div class="kpi-icon kpi-icon-yellow">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.productosStockBajo ?? 0 }}</div>
                <div class="kpi-sub">productos bajo el mínimo</div>
            </div>

            <div class="kpi-card kpi-card-orange">
                <div class="kpi-top">
                    <span class="kpi-label">Necesitan reorden</span>
                    <div class="kpi-icon kpi-icon-orange">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.productosNecesitanReorden ?? 0 }}</div>
                <div class="kpi-sub">bajo punto de reorden</div>
            </div>

            <div class="kpi-card kpi-card-red">
                <div class="kpi-top">
                    <span class="kpi-label">Movimientos hoy</span>
                    <div class="kpi-icon kpi-icon-red">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ summary()?.movimientosHoy ?? 0 }}</div>
                <div class="kpi-sub">registros del día</div>
            </div>

            <!-- IRA — Inventory Record Accuracy (exactitud del último conteo físico) -->
            <div class="kpi-card"
                [class.kpi-card-green]="iraOk()"
                [class.kpi-card-yellow]="iraBelowTarget()"
                [class.kpi-card-teal]="iraValue() === null">
                <div class="kpi-top">
                    <span class="kpi-label">Exactitud (IRA)</span>
                    <div class="kpi-icon"
                        [class.kpi-icon-green]="iraOk()"
                        [class.kpi-icon-yellow]="iraBelowTarget()"
                        [class.kpi-icon-blue]="iraValue() === null">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="kpi-value">{{ iraDisplay() }}</div>
                <div class="kpi-sub">
                    @if (iraValue() === null) { sin conteos cerrados }
                    @else { objetivo ≥ 98% · último conteo }
                </div>
            </div>
        </div>

        @if (summary()) {
            <!-- Charts row -->
            <div class="dash-row dash-row-2-1" style="margin-top:0">
                <!-- Área: Tendencia semanal -->
                <div class="chart-card">
                    <div class="chart-card-header">
                        <span class="chart-card-title">Tendencia Semanal de Movimientos</span>
                        <span style="font-size:0.75rem;color:var(--color-text-muted)">{{ recentMovements().length }} movimientos</span>
                    </div>
                    <div class="chart-card-body">
                        <apx-chart
                            [series]="areaSeries()"
                            [chart]="areaChart"
                            [xaxis]="areaXAxis()"
                            [yaxis]="areaYAxis"
                            [fill]="areaFill"
                            [stroke]="areaStroke"
                            [grid]="areaGrid"
                            [colors]="areaColors"
                            [dataLabels]="{ enabled: false }"
                            [tooltip]="areaTooltip">
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
                                    [style.background]="movement.movementType.startsWith('ENTRADA') ? 'color-mix(in oklch, var(--color-success) 15%, transparent)' : 'color-mix(in oklch, var(--color-warning) 15%, transparent)'"
                                    [style.color]="movement.movementType.startsWith('ENTRADA') ? 'var(--color-success)' : 'var(--color-warning)'">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        @if (movement.movementType.startsWith('ENTRADA')) {
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
        </div>
    `
})
export class InventoryDashboardComponent {
    private readonly api = inject(InventoryApiService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    summary = signal<DashboardSummary | null>(null);
    recentMovements = signal<InventoryMovement[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    readonly breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',     url: '/admin/dashboard' },
        { label: 'Inventario' }
    ];

    /* ── IRA — Inventory Record Accuracy ──────────────────────── */
    readonly iraValue = computed(() => this.summary()?.inventoryAccuracyPct ?? null);
    readonly iraDisplay = computed(() => {
        const v = this.iraValue();
        return v === null ? '—' : `${v.toFixed(1)}%`;
    });
    readonly iraOk = computed(() => { const v = this.iraValue(); return v !== null && v >= 98; });
    readonly iraBelowTarget = computed(() => { const v = this.iraValue(); return v !== null && v < 98; });

    /* ── Chart: Área — tendencia semanal ──────────────────────── */
    areaChart: ApexChart = this.chartDefaults.areaChart(240);
    areaFill: ApexFill = this.chartDefaults.areaFill(CHART_COLORS[0]);
    areaStroke: ApexStroke = this.chartDefaults.areaStroke();
    areaGrid: ApexGrid = this.chartDefaults.grid();
    areaColors = [CHART_COLORS[0]];
    areaTooltip: ApexTooltip = { theme: 'light', y: { formatter: (v: number) => v + ' movimientos' } };

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

    constructor() {
        this.loadSummary();
        this.loadMovements();
    }

    private loadSummary(): void {
        this.loading.set(true);
        this.error.set(null);
        this.api.getDashboardSummary().subscribe({
            next: (response) => { this.summary.set(response); this.loading.set(false); },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    /** Los movimientos recientes no vienen en el dashboard del backend: se cargan aparte. */
    private loadMovements(): void {
        this.api.getMovements({ page: 0, size: 50 }).subscribe({
            next: (res) => this.recentMovements.set(res.content ?? []),
            error: () => this.recentMovements.set([])
        });
    }
}
