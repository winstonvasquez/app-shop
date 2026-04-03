import { Injectable } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid,
         ApexLegend, ApexPlotOptions, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis } from 'ng-apexcharts';

/** Paleta de colores del design system ERP */
const PALETTE = {
    red:    'oklch(0.55 0.22 25)',
    orange: '#FB8C00',
    green:  'oklch(0.72 0.22 150)',
    yellow: 'oklch(0.80 0.18 86)',
    blue:   'oklch(0.65 0.20 250)',
    purple: 'oklch(0.60 0.22 300)',
    teal:   'oklch(0.70 0.18 185)',
};

export const CHART_COLORS: string[] = [
    PALETTE.red, PALETTE.orange, PALETTE.blue,
    PALETTE.green, PALETTE.purple, PALETTE.teal, PALETTE.yellow,
];

@Injectable({ providedIn: 'root' })
export class ChartDefaultsService {
    /** Opciones de tema ApexCharts para dark mode ERP */
    readonly theme = {
        mode: 'dark' as const,
        palette: 'palette1',
    };

    readonly darkBg = 'transparent';
    readonly textColor = 'oklch(0.71 0 0)';   /* --color-gray-400 */
    readonly gridColor = 'oklch(0.27 0 0)';   /* --color-border   */
    readonly fontFamily = 'Inter, system-ui, sans-serif';

    /** Grid base para todos los charts */
    grid(strokeDashArray = 4): ApexGrid {
        return {
            borderColor: this.gridColor,
            strokeDashArray,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { left: 10, right: 10 },
        };
    }

    /** Tooltip compacto */
    tooltip(): ApexTooltip {
        return {
            theme: 'dark',
            style: { fontFamily: this.fontFamily, fontSize: '12px' },
        };
    }

    /** DataLabels desactivados por defecto */
    noLabels(): ApexDataLabels { return { enabled: false }; }

    /** Eje X genérico con categorías */
    xAxis(categories: string[]): ApexXAxis {
        return {
            categories,
            labels: {
                style: { colors: this.textColor, fontFamily: this.fontFamily, fontSize: '11px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        };
    }

    /** Eje Y genérico */
    yAxis(prefix = '', decimals = 0): ApexYAxis {
        return {
            labels: {
                style: { colors: this.textColor, fontFamily: this.fontFamily, fontSize: '11px' },
                formatter: (val) => prefix + val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
            },
        };
    }

    /** Legend minimalista */
    legend(): ApexLegend {
        return {
            labels: { colors: this.textColor },
            fontFamily: this.fontFamily,
            fontSize: '12px',
        };
    }

    /* ─── Preset: Área suavizada ─────────────────────────── */
    areaChart(height = 280): ApexChart {
        return {
            type: 'area',
            height,
            background: this.darkBg,
            fontFamily: this.fontFamily,
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: { enabled: true, speed: 600 },
        };
    }

    areaFill(color: string = PALETTE.red): ApexFill {
        return {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'vertical',
                shadeIntensity: 0.4,
                gradientToColors: [color],
                opacityFrom: 0.55,
                opacityTo: 0.05,
                stops: [0, 100],
            },
        };
    }

    areaStroke(width = 2.5): ApexStroke {
        return { curve: 'smooth', width };
    }

    /* ─── Preset: Barras ─────────────────────────────────── */
    barChart(horizontal = false, height = 260): ApexChart {
        return {
            type: 'bar',
            height,
            background: this.darkBg,
            fontFamily: this.fontFamily,
            toolbar: { show: false },
            animations: { enabled: true, speed: 600 },
        };
    }

    barPlotOptions(horizontal = false, borderRadius = 6, columnWidth = '55%'): ApexPlotOptions {
        return {
            bar: {
                horizontal,
                borderRadius,
                columnWidth,
                borderRadiusApplication: 'end',
            },
        };
    }

    /* ─── Preset: Donut ──────────────────────────────────── */
    donutChart(height = 260): ApexChart {
        return {
            type: 'donut',
            height,
            background: this.darkBg,
            fontFamily: this.fontFamily,
            toolbar: { show: false },
        };
    }

    donutPlotOptions(hollowSize = '65%'): ApexPlotOptions {
        return {
            pie: {
                donut: {
                    size: hollowSize,
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            color: this.textColor,
                            fontFamily: this.fontFamily,
                            fontWeight: '700',
                            fontSize: '14px',
                        },
                        value: {
                            color: 'oklch(0.96 0 0)',
                            fontFamily: this.fontFamily,
                            fontWeight: '700',
                            fontSize: '22px',
                        },
                    },
                },
            },
        };
    }

    /* ─── Preset: Radial Bar ─────────────────────────────── */
    radialChart(height = 220): ApexChart {
        return {
            type: 'radialBar',
            height,
            background: this.darkBg,
            fontFamily: this.fontFamily,
            toolbar: { show: false },
        };
    }

    radialPlotOptions(color: string = PALETTE.green): ApexPlotOptions {
        return {
            radialBar: {
                hollow: { size: '60%' },
                track: { background: this.gridColor },
                dataLabels: {
                    value: {
                        color: 'oklch(0.96 0 0)',
                        fontSize: '22px',
                        fontWeight: '700',
                    },
                },
            },
        };
    }

    /** Últimos 7 días como etiquetas */
    last7DayLabels(): string[] {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return days[d.getDay()];
        });
    }

    /** Últimos 6 meses como etiquetas */
    last6MonthLabels(): string[] {
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            return months[d.getMonth()];
        });
    }
}
