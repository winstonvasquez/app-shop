import { describe, expect, it } from 'vitest';
import { rangoDelMes, ventasPorDia } from './ventas-dashboard.params';

const HOY = new Date(2026, 1, 10); // febrero 2026: 28 días

describe('rangoDelMes', () => {
    it('cubre del 1 al último día del mes', () => {
        expect(rangoDelMes(HOY)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
        expect(rangoDelMes(new Date(2026, 9, 13))).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    });
});

describe('ventasPorDia', () => {
    it('sin pedidos devuelve un día en cero por cada día del mes (nada inventado)', () => {
        const s = ventasPorDia([], HOY);
        expect(s).toHaveLength(28);
        expect(s.every(v => v === 0)).toBe(true);
    });

    it('suma por día sólo lo cobrado: excluye pendientes, cancelados y otros meses', () => {
        const s = ventasPorDia([
            { fechaPedido: '2026-02-03T10:00:00', estado: 'PAGADO', total: 100.1 },
            { fechaPedido: '2026-02-03T23:59:00', estado: 'PENDIENTE', total: 50.2 },
            { fechaPedido: '2026-02-03T12:00:00', estado: 'CANCELADO', total: 999 },
            { fechaPedido: '2026-01-31T12:00:00', estado: 'PAGADO', total: 500 },
            { fechaPedido: '2026-02-28T00:00:00', estado: 'ENTREGADO', total: 20 },
        ], HOY);
        expect(s[2]).toBe(100.1);
        expect(s[27]).toBe(20);
        expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(120.1);
    });
});
