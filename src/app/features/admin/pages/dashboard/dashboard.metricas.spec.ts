import { describe, expect, it } from 'vitest';
import { DashboardKpis, metricasDeDashboard } from './dashboard.metricas';

const base: DashboardKpis = {
    periodo: '2026-10',
    ventas: { totalVentas: 3, montoTotal: 1500, ticketPromedio: 500, disponible: true },
    inventario: { productosConStock: 40, productosStockBajo: 2, disponible: true },
};

describe('metricasDeDashboard', () => {
    it('mapea los KPIs reales', () => {
        const m = metricasDeDashboard(base);
        expect(m.map(x => x.label)).toContain('Productos con stock');
        expect(m[1].value).toBe('3');
        expect(m[3].detail).toBe('2 con stock bajo');
    });

    it('un módulo caído muestra «No disponible», nunca un cero', () => {
        const m = metricasDeDashboard({ ...base, ventas: { ...base.ventas, disponible: false } });
        expect(m[0].value).toBe('—');
        expect(m[0].detail).toBe('No disponible');
    });
});
