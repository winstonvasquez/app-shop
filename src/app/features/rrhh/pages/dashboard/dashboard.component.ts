import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { EmployeeService } from '../../services/employee.service';
import { VacationService } from '../../services/vacation.service';
import { ChartDefaultsService, CHART_COLORS } from '@shared/services/chart-defaults.service';
import {
    ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid,
    ApexNonAxisChartSeries, ApexPlotOptions, ApexLegend, ApexTooltip, ApexXAxis, ApexYAxis
} from 'ng-apexcharts';

interface AccesoRapido {
    ruta: string; titulo: string; descripcion: string; color: string;
}

@Component({
    selector: 'app-rrhh-dashboard',
    standalone: true,
    imports: [RouterLink, NgApexchartsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly vacationService = inject(VacationService);
    private readonly chartDefaults = inject(ChartDefaultsService);

    readonly totalEmployees    = signal(0);
    readonly activeEmployees   = signal(0);
    readonly attendanceToday   = signal(0);
    readonly pendingVacations  = signal(0);
    readonly upcomingEvaluations = signal(0);

    readonly periodoActual = new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' });

    asistenciaPct = computed(() =>
        this.totalEmployees() > 0
            ? Math.round((this.attendanceToday() / this.totalEmployees()) * 100)
            : 0
    );

    /* ── Chart: Radial — tasa asistencia ─────────────────────── */
    radialChart: ApexChart = this.chartDefaults.radialChart(200);
    radialSeries: ApexNonAxisChartSeries = [0];
    radialColors = [CHART_COLORS[2]];
    radialPlot: ApexPlotOptions = {
        radialBar: {
            hollow: { size: '58%' },
            track: { background: 'oklch(0.27 0 0)' },
            dataLabels: {
                name: { color: 'oklch(0.71 0 0)', fontSize: '13px' },
                value: { color: 'oklch(0.96 0 0)', fontSize: '24px', fontWeight: '700',
                         formatter: (val) => `${Math.round(val)}%` }
            }
        }
    };

    /* ── Chart: Bar — empleados por área (mock) ───────────────── */
    barChart: ApexChart = this.chartDefaults.barChart(false, 200);
    barSeries: ApexAxisChartSeries = [{
        name: 'Empleados',
        data: [12, 8, 15, 6, 9, 4]
    }];
    barXAxis: ApexXAxis = this.chartDefaults.xAxis(['Ventas', 'Admin', 'Ops', 'TI', 'RRHH', 'Logística']);
    barYAxis: ApexYAxis = { labels: { style: { colors: this.chartDefaults.textColor } } };
    barTooltip: ApexTooltip = { theme: 'dark', y: { formatter: (v: number) => v + ' personas' } };
    barPlot: ApexPlotOptions = this.chartDefaults.barPlotOptions(false, 8, '60%');
    barGrid: ApexGrid = this.chartDefaults.grid(3);
    barColors = [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2], CHART_COLORS[3], CHART_COLORS[4], CHART_COLORS[5]];
    barDataLabels: ApexDataLabels = { enabled: false };
    barFill = { colors: this.barColors, type: 'solid' };

    readonly accesosRapidos: AccesoRapido[] = [
        { ruta: '/rrhh/employees',   titulo: 'Empleados',             descripcion: 'Gestionar nómina, contratos y datos personales',      color: CHART_COLORS[0] },
        { ruta: '/rrhh/attendance',  titulo: 'Asistencia',            descripcion: 'Control de marcaciones, tardanzas y horas extras',    color: CHART_COLORS[2] },
        { ruta: '/rrhh/vacations',   titulo: 'Vacaciones y Licencias',descripcion: 'Solicitudes, aprobaciones y saldo de días',            color: CHART_COLORS[1] },
        { ruta: '/rrhh/payroll',     titulo: 'Planilla Remunerativa', descripcion: 'AFP, ONP, renta 5ta, ESSALUD y boletas de pago',      color: CHART_COLORS[5] },
        { ruta: '/rrhh/evaluations', titulo: 'Evaluaciones',          descripcion: 'Seguimiento por período y competencias',              color: CHART_COLORS[3] },
        { ruta: '/rrhh/trainings',   titulo: 'Capacitaciones',        descripcion: 'Plan anual de formación y desarrollo',                color: CHART_COLORS[4] },
    ];

    async ngOnInit(): Promise<void> {
        try {
            await Promise.all([
                this.employeeService.loadEmployees(),
                this.vacationService.loadVacations()
            ]);
            this.totalEmployees.set(this.employeeService.totalEmployees());
            this.activeEmployees.set(this.employeeService.activeEmployees().length);
            const vacations = this.vacationService.vacations();
            this.pendingVacations.set(vacations.filter(v => v.estado === 'SOLICITADO').length);

            /* Actualizar radial con datos reales */
            this.radialSeries = [this.asistenciaPct()];
        } catch {
            /* servicios no disponibles — mock data */
            this.totalEmployees.set(54);
            this.activeEmployees.set(51);
            this.attendanceToday.set(48);
            this.pendingVacations.set(3);
            this.upcomingEvaluations.set(7);
            this.radialSeries = [89];
        }
    }
}
