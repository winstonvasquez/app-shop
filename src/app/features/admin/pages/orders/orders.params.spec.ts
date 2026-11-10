import { describe, expect, it } from 'vitest';
import {
    filtrosDePedidos, FiltrosPedidoCrudos, clienteDePedido, etiquetaDe,
    METODOS_PAGO_PEDIDO, ESTADOS_PAGO_PEDIDO, errorReferenciaPago, comprobanteDePedido, estadoCpeDePedido,
    accionesDePedido,
} from './orders.params';

describe('accionesDePedido (TIENDA-6 / VB-2)', () => {
    it('contra entrega: envía sin cobrar, rechaza en puerta y cobra tras entregar', () => {
        expect(accionesDePedido('PENDIENTE', 'EFECTIVO', 'PENDIENTE')).toEqual(['ENVIAR', 'MARCAR_PAGADO', 'CANCELAR']);
        expect(accionesDePedido('PAGADO', 'EFECTIVO', 'PENDIENTE')).toEqual(['ENVIAR', 'CANCELAR']);
        expect(accionesDePedido('ENVIADO', 'EFECTIVO', 'PENDIENTE')).toEqual(['ENTREGAR', 'RECHAZAR_ENTREGA']);
        expect(accionesDePedido('ENTREGADO', 'EFECTIVO', 'PENDIENTE')).toEqual(['REGISTRAR_COBRO']);
        expect(accionesDePedido('CANCELADO', 'EFECTIVO', 'PENDIENTE')).toEqual([]);
    });

    it('otros métodos: sin «Enviar» antes de cobrar, sin rechazo ni cobro posterior', () => {
        for (const m of ['YAPE', 'PLIN', 'TRANSFERENCIA_BANCARIA', 'TARJETA_CREDITO']) {
            expect(accionesDePedido('PENDIENTE', m, 'PENDIENTE')).toEqual(['MARCAR_PAGADO', 'CANCELAR']);
            expect(accionesDePedido('ENVIADO', m, 'COMPLETADO')).toEqual(['ENTREGAR']);
            expect(accionesDePedido('ENTREGADO', m, 'COMPLETADO')).toEqual([]);
        }
    });

    it('efectivo ya cobrado se comporta como pago normal (sin rechazo ni segundo cobro: darían 409)', () => {
        expect(accionesDePedido('PENDIENTE', 'EFECTIVO', 'COMPLETADO')).toEqual(['MARCAR_PAGADO', 'CANCELAR']);
        expect(accionesDePedido('ENVIADO', 'EFECTIVO', 'COMPLETADO')).toEqual(['ENTREGAR']);
        expect(accionesDePedido('ENTREGADO', 'EFECTIVO', 'COMPLETADO')).toEqual([]);
    });

    it('todo estado no terminal tiene al menos una salida', () => {
        for (const e of ['PENDIENTE', 'PAGADO', 'ENVIADO']) {
            expect(accionesDePedido(e, 'EFECTIVO', 'PENDIENTE').length).toBeGreaterThan(0);
        }
    });
});

describe('errorReferenciaPago', () => {
    it('exige referencia en transferencia, Yape y Plin', () => {
        for (const m of ['TRANSFERENCIA_BANCARIA', 'YAPE', 'PLIN']) {
            expect(errorReferenciaPago(m, '   ')).toContain('N.º de operación');
            expect(errorReferenciaPago(m, 'OP-123')).toBeNull();
        }
    });

    it('no la exige en efectivo, tarjeta ni sin método', () => {
        expect(errorReferenciaPago('EFECTIVO', '')).toBeNull();
        expect(errorReferenciaPago('TARJETA_CREDITO', '')).toBeNull();
        expect(errorReferenciaPago(undefined, '')).toBeNull();
    });

    it('rechaza más de 100 caracteres', () => {
        expect(errorReferenciaPago('EFECTIVO', 'x'.repeat(101))).toContain('100');
        expect(errorReferenciaPago('EFECTIVO', 'x'.repeat(100))).toBeNull();
    });
});

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

describe('clienteDePedido', () => {
    it('con usuario muestra su id', () => {
        expect(clienteDePedido({ usuarioId: 7 })).toBe('Usuario #7');
    });
    it('de invitado muestra el correo, nunca «Usuario #null»', () => {
        expect(clienteDePedido({ usuarioId: null, guestEmail: 'a@b.pe' })).toBe('a@b.pe (invitado)');
        expect(clienteDePedido({ usuarioId: null })).toBe('Invitado');
    });
});

describe('etiquetaDe', () => {
    it('traduce un código del enum y deja pasar uno desconocido', () => {
        expect(etiquetaDe(METODOS_PAGO_PEDIDO, 'TRANSFERENCIA_BANCARIA')).toBe('Transferencia bancaria');
        expect(etiquetaDe(METODOS_PAGO_PEDIDO, 'OTRO')).toBe('OTRO');
        expect(etiquetaDe(ESTADOS_PAGO_PEDIDO, undefined)).toBe('—');
    });
});

describe('comprobante del pedido (VB-9)', () => {
    it('serie-número, tipo sin número, o «Sin comprobante»', () => {
        expect(comprobanteDePedido({ cpeTipo: 'BOLETA', cpeSerie: 'B001', cpeNumero: '00000012' })).toBe('B001-00000012');
        expect(comprobanteDePedido({ cpeTipo: 'FACTURA', cpeSerie: null, cpeNumero: null })).toBe('Factura sin emitir');
        expect(comprobanteDePedido({ cpeTipo: null })).toBe('Sin comprobante');
    });

    it('estado del CPE: etiqueta y badge; null si no hay', () => {
        expect(estadoCpeDePedido('ERROR')).toEqual({ label: 'Error SUNAT', badge: 'badge-error' });
        expect(estadoCpeDePedido('RARO')?.badge).toBe('badge-neutral');
        expect(estadoCpeDePedido(null)).toBeNull();
    });
});
