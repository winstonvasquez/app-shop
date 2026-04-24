import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { CajasService } from '../../services/cajas.service';
import { PagosService } from '../../services/pagos.service';
import { MovimientosFinancierosService } from '../../services/movimientos-financieros.service';
import { CashRegister, Payment, FinancialMovement } from '../../models/tesoreria.model';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexFill, ApexGrid,
    ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend
} from 'ng-apexcharts';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-dashboard-tesoreria',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, RouterLink, NgApexchartsModule, ButtonComponent],
    templateUrl: './dashboard-tesoreria.component.html'
})
export class DashboardTesoreriaComponent implements OnInit {
    private cajasService = inject(CajasService);
    private pagosService = inject(PagosService);
    private movimientosService = inject(MovimientosFinancierosService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    cargando = signal(false);
    error = signal<string | null>(null);
    cajas = signal<CashRegister[]>([]);
    pagosRecientes = signal<Payment[]>([]);
    movimientos = signal<FinancialMovement[]>([]);
    readonly hoy = new Date();

    cajasAbiertas  = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    totalCajas     = computed(() => this.cajas().length);
    saldoTotalCajas = computed(() =>
        this.cajas().filter(c => c.estado === 'ABIERTA').reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );
    pagosPendientes = computed(() => this.pagosRecientes().filter(p => p.estado === 'PENDING').length);
    ingresosHoy = computed(() => {
        const hoy = this.hoy.toISOString().split('T')[0];
        return this.movimientos()
            .filter(m => m.tipoMovimiento === 'INGRESO' && m.fecha?.startsWith(hoy))
            .reduce((s, m) => s + (m.monto ?? 0), 0);
    });
    egresosHoy = computed(() => {
        const hoy = this.hoy.toISOString().split('T')[0];
        return this.movimientos()
            .filter(m => m.tipoMovimiento === 'EGRESO' && m.fecha?.startsWith(hoy))
            .reduce((s, m) => s + (m.monto ?? 0), 0);
    });

    /* ── Chart: Flujo de caja (área doble) ────────────────────── */
    areaChart: ApexChart = this.chartDefaults.areaChart(240);
    areaSeries: ApexAxisChartSeries = [
        { name: 'Ingresos', data: [4200, 5800, 3900, 7200, 6100, 8400, 5700] },
        { name: 'Egresos',  data: [3100, 4200, 2800, 5100, 4300, 6200, 4100] }
    ];
    areaXAxis: ApexXAxis = this.chartDefaults.xAxis(this.chartDefaults.last7DayLabels());
    areaYAxis: ApexYAxis = this.chartDefaults.yAxis('S/ ');
    areaFill: ApexFill = {
        type: 'gradient',
        gradient: {
            shade: 'dark', type: 'vertical', shadeIntensity: 0.3,
            opacityFrom: 0.45, opacityTo: 0.05,
        }
    };
    areaStroke: ApexStroke = this.chartDefaults.areaStroke(2);
    areaGrid: ApexGrid = this.chartDefaults.grid();
    areaColors = [CHART_COLORS[2], CHART_COLORS[0]];
    areaLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'top' };
    areaTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => 'S/ ' + v.toLocaleString('es-PE') } };

    /* ── Chart: Distribución por tipo pago (donut) ────────────── */
    donutChart: ApexChart = this.chartDefaults.donutChart(200);
    donutSeries: ApexNonAxisChartSeries = [42, 28, 18, 12];
    donutLabels = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otros'];
    donutColors = [CHART_COLORS[0], CHART_COLORS[2], CHART_COLORS[1], CHART_COLORS[5]];
    donutPlot: ApexPlotOptions = this.chartDefaults.donutPlotOptions('62%');
    donutLegend: ApexLegend = { ...this.chartDefaults.legend(), position: 'bottom' };

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.error.set(null);
        forkJoin({
            cajas: this.cajasService.getAll(0, 50),
            pagos: this.pagosService.getAll(0, 10),
            movimientos: this.movimientosService.getAll(undefined, undefined, 0, 20)
        }).subscribe({
            next: ({ cajas, pagos, movimientos }) => {
                this.cajas.set(Array.isArray(cajas) ? cajas : (cajas?.content ?? []));
                this.pagosRecientes.set(Array.isArray(pagos) ? pagos : (pagos?.content ?? []));
                this.movimientos.set(Array.isArray(movimientos) ? movimientos : (movimientos?.content ?? []));
                this.cargando.set(false);
            },
            error: () => { this.error.set('No disponible'); this.cargando.set(false); }
        });
    }

    badgePago(estado: string): string {
        const map: Record<string, string> = {
            PENDING: 'badge badge-warning', APPROVED: 'badge badge-accent',
            PAID: 'badge badge-success', REJECTED: 'badge badge-error'
        };
        return map[estado] ?? 'badge badge-neutral';
    }

    badgeMovimiento(tipo: string): string {
        const map: Record<string, string> = {
            INGRESO: 'badge badge-success', EGRESO: 'badge badge-warning',
            TRANSFERENCIA: 'badge badge-accent'
        };
        return map[tipo] ?? 'badge badge-neutral';
    }
}
