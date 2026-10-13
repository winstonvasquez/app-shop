import { describe, expect, it } from 'vitest';
import {
    claseBadgeEstadoFactura,
    claseBadgeMatch,
    claseBadgeSunat,
    construirRegistrarFacturaRequest,
} from './facturas-proveedor.form';

describe('construirRegistrarFacturaRequest', () => {
    it('con el formulario completo copia todo y no aplica ningún default', () => {
        const req = construirRegistrarFacturaRequest({
            ordenCompraId: 'oc-1',
            serie: 'F001',
            numero: '00001234',
            tipoDocumento: 'BOLETA',
            fechaEmision: '2026-08-01',
            fechaVencimiento: '2026-08-31',
            moneda: 'USD',
            observaciones: 'Entrega parcial',
            items: [
                { ordenItemId: 'oi-1', productoNombre: 'Cemento', sku: 'CEM-42', cantidad: 10, precioUnitario: 25.5 },
            ],
        });

        expect(req).toEqual({
            ordenCompraId: 'oc-1',
            serie: 'F001',
            numero: '00001234',
            tipoDocumento: 'BOLETA',
            fechaEmision: '2026-08-01',
            fechaVencimiento: '2026-08-31',
            moneda: 'USD',
            observaciones: 'Entrega parcial',
            items: [
                { ordenItemId: 'oi-1', productoNombre: 'Cemento', sku: 'CEM-42', cantidad: 10, precioUnitario: 25.5 },
            ],
        });
    });

    it('con el formulario vacío aplica los defaults del alta y omite los opcionales', () => {
        const req = construirRegistrarFacturaRequest({});

        // Obligatorios: cadena vacía (el backend los rechaza con 400 explícito).
        expect(req.ordenCompraId).toBe('');
        expect(req.serie).toBe('');
        expect(req.numero).toBe('');
        expect(req.fechaEmision).toBe('');
        // Defaults del alta.
        expect(req.tipoDocumento).toBe('FACTURA');
        expect(req.moneda).toBe('PEN');
        // Opcionales ausentes, NO cadena vacía.
        expect(req.fechaVencimiento).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
        expect(req.items).toEqual([]);
    });

    it('convierte a undefined los opcionales que llegan como cadena vacía', () => {
        // El control existe y está vacío: es «no llenado», no un valor.
        const req = construirRegistrarFacturaRequest({
            fechaVencimiento: '',
            observaciones: '',
            items: [{ ordenItemId: '', productoNombre: 'Clavos', sku: '', cantidad: 1, precioUnitario: 3 }],
        });

        expect(req.fechaVencimiento).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
        expect(req.items[0].ordenItemId).toBeUndefined();
        expect(req.items[0].sku).toBeUndefined();
    });

    it('respeta la cadena vacía en los obligatorios en vez de inventar un valor', () => {
        const req = construirRegistrarFacturaRequest({ serie: '', numero: '', fechaEmision: '' });
        expect(req.serie).toBe('');
        expect(req.numero).toBe('');
        expect(req.fechaEmision).toBe('');
    });

    it('mantiene el tipoDocumento y la moneda vacíos si el control los trae así', () => {
        // `??` no los suple: solo el null/undefined del control cae al default.
        const req = construirRegistrarFacturaRequest({ tipoDocumento: '', moneda: '' });
        expect(req.tipoDocumento).toBe('');
        expect(req.moneda).toBe('');
    });

    it('trata null igual que ausente en todos los campos', () => {
        const req = construirRegistrarFacturaRequest({
            ordenCompraId: null,
            serie: null,
            numero: null,
            tipoDocumento: null,
            fechaEmision: null,
            fechaVencimiento: null,
            moneda: null,
            observaciones: null,
            items: null,
        });

        expect(req.ordenCompraId).toBe('');
        expect(req.tipoDocumento).toBe('FACTURA');
        expect(req.moneda).toBe('PEN');
        expect(req.fechaVencimiento).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
        expect(req.items).toEqual([]);
    });

    it('numeriza cantidad y precio, que el input de texto entrega como cadena', () => {
        const req = construirRegistrarFacturaRequest({
            items: [{ productoNombre: 'Fierro', cantidad: '12', precioUnitario: '4.75' }],
        });
        expect(req.items[0].cantidad).toBe(12);
        expect(req.items[0].precioUnitario).toBe(4.75);
    });

    it('conserva el 0 legítimo de precio: es un dato, no un hueco', () => {
        // Muestra gratis / bonificación: precio 0 debe viajar como 0, no como NaN ni ausente.
        const req = construirRegistrarFacturaRequest({
            items: [{ productoNombre: 'Muestra', cantidad: 1, precioUnitario: 0 }],
        });
        expect(req.items[0].precioUnitario).toBe(0);
    });

    it('mapea varios ítems conservando el orden', () => {
        const req = construirRegistrarFacturaRequest({
            items: [
                { productoNombre: 'A', cantidad: 1, precioUnitario: 10 },
                { productoNombre: 'B', cantidad: 2, precioUnitario: 20 },
            ],
        });
        expect(req.items.map((i) => i.productoNombre)).toEqual(['A', 'B']);
    });
});

describe('claseBadgeEstadoFactura', () => {
    it('pinta cada estado del ciclo de aprobación', () => {
        expect(claseBadgeEstadoFactura('PENDIENTE')).toBe('badge badge-warning');
        expect(claseBadgeEstadoFactura('APROBADA')).toBe('badge badge-success');
        expect(claseBadgeEstadoFactura('RECHAZADA')).toBe('badge badge-error');
    });

    it('cae a neutro ante un estado desconocido', () => {
        expect(claseBadgeEstadoFactura('ANULADA')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoFactura('')).toBe('badge badge-neutral');
    });
});

describe('claseBadgeMatch', () => {
    it('solo el match total es verde y el parcial avisa', () => {
        expect(claseBadgeMatch('OK_TOTAL')).toBe('badge badge-success');
        expect(claseBadgeMatch('OK_PARCIAL')).toBe('badge badge-warning');
    });

    it('cualquier otro resultado conocido es discrepancia y va en rojo', () => {
        expect(claseBadgeMatch('DIFERENCIA_PRECIO')).toBe('badge badge-error');
        expect(claseBadgeMatch('DIFERENCIA_CANTIDAD')).toBe('badge badge-error');
    });

    it('sin match todavía se pinta neutro, no rojo', () => {
        // La rama del `if`: sin este caso, una factura recién registrada se vería
        // como discrepancia antes de que corra el match.
        expect(claseBadgeMatch(undefined)).toBe('badge badge-neutral');
        expect(claseBadgeMatch('')).toBe('badge badge-neutral');
    });
});

describe('claseBadgeSunat', () => {
    it('solo ACEPTADA es verde y solo RECHAZADA es roja', () => {
        expect(claseBadgeSunat('ACEPTADA')).toBe('badge badge-success');
        expect(claseBadgeSunat('RECHAZADA')).toBe('badge badge-error');
    });

    it('los estados intermedios quedan en ámbar porque aún pueden resolverse', () => {
        expect(claseBadgeSunat('EN_PROCESO')).toBe('badge badge-warning');
        expect(claseBadgeSunat('OBSERVADA')).toBe('badge badge-warning');
    });

    it('sin validar todavía se pinta neutro', () => {
        expect(claseBadgeSunat(undefined)).toBe('badge badge-neutral');
        expect(claseBadgeSunat('')).toBe('badge badge-neutral');
    });
});
