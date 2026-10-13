import { describe, expect, it } from 'vitest';
import { claseBadgeEstadoDevolucion, construirCrearDevolucionRequest } from './devoluciones.form';

describe('construirCrearDevolucionRequest', () => {
    it('con el formulario completo copia todo y no aplica defaults', () => {
        const req = construirCrearDevolucionRequest({
            ordenCompraId: 'oc-1',
            recepcionId: 'rec-1',
            motivo: 'PRODUCTO_DEFECTUOSO',
            tipo: 'CAMBIO',
            observaciones: 'Lote con humedad',
            items: [
                { ordenItemId: 'oi-1', productoNombre: 'Cemento', sku: 'CEM-425', cantidad: 5, motivoItem: 'Sacos rotos' },
            ],
        });

        expect(req).toEqual({
            ordenCompraId: 'oc-1',
            recepcionId: 'rec-1',
            motivo: 'PRODUCTO_DEFECTUOSO',
            tipo: 'CAMBIO',
            observaciones: 'Lote con humedad',
            items: [
                { ordenItemId: 'oi-1', productoNombre: 'Cemento', sku: 'CEM-425', cantidad: 5, motivoItem: 'Sacos rotos' },
            ],
        });
    });

    it('con el formulario vacío deja obligatorios en blanco y cae al tipo DEVOLUCION', () => {
        const req = construirCrearDevolucionRequest({});
        expect(req.ordenCompraId).toBe('');
        expect(req.motivo).toBe('');
        expect(req.tipo).toBe('DEVOLUCION');
        expect(req.recepcionId).toBeUndefined();
        expect(req.observaciones).toBeUndefined();
        expect(req.items).toEqual([]);
    });

    it('omite recepcionId vacío: es una devolución contra la OC, no contra una recepción', () => {
        // Cadena vacía significa «sin recepción»; si viajara, el backend intentaría
        // resolverla como UUID.
        expect(construirCrearDevolucionRequest({ recepcionId: '' }).recepcionId).toBeUndefined();
        expect(construirCrearDevolucionRequest({ recepcionId: null }).recepcionId).toBeUndefined();
    });

    it('conserva el tipo vacío si el control lo trae así: `??` solo suple ausencia', () => {
        expect(construirCrearDevolucionRequest({ tipo: '' }).tipo).toBe('');
        expect(construirCrearDevolucionRequest({ tipo: null }).tipo).toBe('DEVOLUCION');
    });

    it('omite los opcionales vacíos de cada línea', () => {
        const req = construirCrearDevolucionRequest({
            items: [{ ordenItemId: '', productoNombre: 'Clavos', sku: '', cantidad: 2, motivoItem: '' }],
        });
        expect(req.items[0].ordenItemId).toBeUndefined();
        expect(req.items[0].sku).toBeUndefined();
        expect(req.items[0].motivoItem).toBeUndefined();
        expect(req.items[0].productoNombre).toBe('Clavos');
    });

    it('no copia el motivo de cabecera en el motivo de línea', () => {
        // Son campos distintos: causa general vs matiz por producto.
        const req = construirCrearDevolucionRequest({
            motivo: 'PRODUCTO_DEFECTUOSO',
            items: [{ productoNombre: 'Fierro', cantidad: 1 }],
        });
        expect(req.items[0].motivoItem).toBeUndefined();
    });

    it('numeriza la cantidad, que el input entrega como cadena', () => {
        const req = construirCrearDevolucionRequest({ items: [{ productoNombre: 'X', cantidad: '7' }] });
        expect(req.items[0].cantidad).toBe(7);
    });

    it('trata null igual que ausente en todos los campos', () => {
        const req = construirCrearDevolucionRequest({
            ordenCompraId: null,
            recepcionId: null,
            motivo: null,
            tipo: null,
            observaciones: null,
            items: null,
        });
        expect(req.ordenCompraId).toBe('');
        expect(req.motivo).toBe('');
        expect(req.tipo).toBe('DEVOLUCION');
        expect(req.items).toEqual([]);
    });

    it('mapea varias líneas conservando el orden', () => {
        const req = construirCrearDevolucionRequest({
            items: [
                { productoNombre: 'A', cantidad: 1 },
                { productoNombre: 'B', cantidad: 2 },
            ],
        });
        expect(req.items.map((i) => i.productoNombre)).toEqual(['A', 'B']);
    });
});

describe('claseBadgeEstadoDevolucion', () => {
    it('pinta cada estado del ciclo de la devolución', () => {
        expect(claseBadgeEstadoDevolucion('BORRADOR')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoDevolucion('ENVIADA')).toBe('badge badge-accent');
        expect(claseBadgeEstadoDevolucion('COMPLETADA')).toBe('badge badge-success');
        expect(claseBadgeEstadoDevolucion('RECHAZADA')).toBe('badge badge-error');
    });

    it('aceptada sigue en ámbar: el proveedor aceptó pero la nota de crédito no llegó', () => {
        expect(claseBadgeEstadoDevolucion('ACEPTADA')).toBe('badge badge-warning');
    });

    it('cae a neutro sin estado o ante un estado desconocido', () => {
        expect(claseBadgeEstadoDevolucion(undefined)).toBe('badge badge-neutral');
        expect(claseBadgeEstadoDevolucion('')).toBe('badge badge-neutral');
        expect(claseBadgeEstadoDevolucion('ANULADA')).toBe('badge badge-neutral');
    });
});
