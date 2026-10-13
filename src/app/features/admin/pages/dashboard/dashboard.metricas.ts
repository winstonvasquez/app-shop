import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';

export interface MetricCard {
    label: string;
    value: string;
    /** Pie de la tarjeta: el periodo, o el motivo si el módulo no respondió. */
    detail: string;
    disponible: boolean;
    iconColor: 'red' | 'orange' | 'green' | 'blue';
    iconSvg: string;
}

// Subconjunto de DashboardEjecutivo (GET /api/analytics/dashboard) que consume esta pantalla.
// `disponible` es false cuando el módulo no respondió: se muestra «No disponible», nunca un 0 falso.
export interface DashboardKpis {
    periodo: string;
    ventas: { totalVentas: number; montoTotal: number; ticketPromedio: number; disponible: boolean };
    inventario: { productosConStock: number; productosStockBajo: number; disponible: boolean };
}

const NO_DISPONIBLE = 'No disponible';
const SIN_DATO = '—';

const dinero = (n: number): string =>
    `${CURRENCY_DISPLAY.SYMBOL_PEN} ${n.toLocaleString(CURRENCY_DISPLAY.LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mapeo puro del DTO de analítica a tarjetas. Sin fuente real no hay tarjeta (nada inventado). */
export function metricasDeDashboard(d: DashboardKpis): MetricCard[] {
    const detalle = (ok: boolean) => (ok ? `Periodo ${d.periodo}` : NO_DISPONIBLE);
    const v = d.ventas;
    const i = d.inventario;
    return [
        {
            label: 'Ventas del periodo', value: v.disponible ? dinero(v.montoTotal) : SIN_DATO,
            detail: detalle(v.disponible), disponible: v.disponible, iconColor: 'red',
            iconSvg: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
            label: 'N.º de ventas', value: v.disponible ? String(v.totalVentas) : SIN_DATO,
            detail: detalle(v.disponible), disponible: v.disponible, iconColor: 'orange',
            iconSvg: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
        },
        {
            label: 'Ticket promedio', value: v.disponible ? dinero(v.ticketPromedio) : SIN_DATO,
            detail: detalle(v.disponible), disponible: v.disponible, iconColor: 'blue',
            iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
        },
        {
            label: 'Productos con stock', value: i.disponible ? String(i.productosConStock) : SIN_DATO,
            detail: i.disponible ? `${i.productosStockBajo} con stock bajo` : NO_DISPONIBLE,
            disponible: i.disponible, iconColor: 'green',
            iconSvg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
        },
    ];
}
