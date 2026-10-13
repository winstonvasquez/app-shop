import { describe, expect, it } from 'vitest';
import { filtrosDePedidos, FiltrosPedidoCrudos } from './orders.params';

/** Estado inicial de la pantalla: ningún filtro tocado. */
const VACIO: FiltrosPedidoCrudos = {
    estado: '', cpeTipo: '', cpeEstado: '', metodoPago: '', estadoPago: '',
    fechaPedidoDesde: undefined, fechaPedidoHasta: undefined,
    cpeFechaEmisionDesde: undefined, cpeFechaEmisionHasta: undefined,
};

describe('filtrosDePedidos', () => {
    it('con todos los filtros puestos los pasa tal cual', () => {
        expect(filtrosDePedidos({
            estado: 'PENDIENTE', cpeTipo: '01', cpeEstado: 'ACEPTADO',
            metodoPago: 'EFECTIVO', estadoPago: 'COMPLETADO',
            fechaPedidoDesde: '2026-01-01', fechaPedidoHasta: '2026-01-31',
            cpeFechaEmisionDesde: '2026-02-01', cpeFechaEmisionHasta: '2026-02-28',
        })).toEqual({
            estado: 'PENDIENTE', cpeTipo: '01', cpeEstado: 'ACEPTADO',
            metodoPago: 'EFECTIVO', estadoPago: 'COMPLETADO',
            fechaPedidoDesde: '2026-01-01', fechaPedidoHasta: '2026-01-31',
            cpeFechaEmisionDesde: '2026-02-01', cpeFechaEmisionHasta: '2026-02-28',
        });
    });

    it('sin nada elegido ningún select viaja: todos undefined', () => {
        const f = filtrosDePedidos(VACIO);
        expect(f.estado).toBeUndefined();
        expect(f.cpeTipo).toBeUndefined();
        expect(f.cpeEstado).toBeUndefined();
        expect(f.metodoPago).toBeUndefined();
        expect(f.estadoPago).toBeUndefined();
    });

    it('las fechas ausentes se propagan como undefined, no como ""', () => {
        const f = filtrosDePedidos(VACIO);
        expect(f.fechaPedidoDesde).toBeUndefined();
        expect(f.fechaPedidoHasta).toBeUndefined();
        expect(f.cpeFechaEmisionDesde).toBeUndefined();
        expect(f.cpeFechaEmisionHasta).toBeUndefined();
    });

    it('un rango de fecha abierto por un solo extremo conserva ese extremo', () => {
        const f = filtrosDePedidos({ ...VACIO, fechaPedidoDesde: '2026-03-01' });
        expect(f.fechaPedidoDesde).toBe('2026-03-01');
        expect(f.fechaPedidoHasta).toBeUndefined();
    });

    it('un select suelto no arrastra a los demás', () => {
        const f = filtrosDePedidos({ ...VACIO, estadoPago: 'FALLIDO' });
        expect(f.estadoPago).toBe('FALLIDO');
        expect(f.estado).toBeUndefined();
        expect(f.metodoPago).toBeUndefined();
    });
});
