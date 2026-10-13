import { describe, expect, it } from 'vitest';
import { AsnFiltrosUI, asnFiltrosParams } from './asn.params';

/** Estado del toolbar recién abierto: nada elegido. */
const VACIO: AsnFiltrosUI = {
    q: '', status: '', warehouseId: '', supplierName: '',
    expectedDesde: null, expectedHasta: null,
    receivedDesde: null, receivedHasta: null,
    createdDesde: null, createdHasta: null
};

describe('asnFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(asnFiltrosParams({
            q: 'ASN-1', status: 'PENDIENTE', warehouseId: '7', supplierName: 'Acme',
            expectedDesde: '2026-01-01', expectedHasta: '2026-01-31',
            receivedDesde: '2026-02-01', receivedHasta: '2026-02-28',
            createdDesde: '2026-03-01', createdHasta: '2026-03-31'
        })).toEqual({
            q: 'ASN-1', status: 'PENDIENTE', warehouseId: 7, supplierName: 'Acme',
            expectedDesde: '2026-01-01', expectedHasta: '2026-01-31',
            receivedDesde: '2026-02-01', receivedHasta: '2026-02-28',
            createdDesde: '2026-03-01', createdHasta: '2026-03-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = asnFiltrosParams(VACIO);
        // Uno a uno: un solo campo que se colara como '' o null ensuciaría la query.
        expect(r.q).toBeUndefined();
        expect(r.status).toBeUndefined();
        expect(r.warehouseId).toBeUndefined();
        expect(r.supplierName).toBeUndefined();
        expect(r.expectedDesde).toBeUndefined();
        expect(r.expectedHasta).toBeUndefined();
        expect(r.receivedDesde).toBeUndefined();
        expect(r.receivedHasta).toBeUndefined();
        expect(r.createdDesde).toBeUndefined();
        expect(r.createdHasta).toBeUndefined();
    });

    it('el almacén viaja como número, no como la cadena del <select>', () => {
        expect(asnFiltrosParams({ ...VACIO, warehouseId: '12' }).warehouseId).toBe(12);
    });

    it('almacén "0" es un id legítimo y NO se descarta', () => {
        // '0' es cadena no vacía → el usuario sí eligió; se manda el número 0.
        expect(asnFiltrosParams({ ...VACIO, warehouseId: '0' }).warehouseId).toBe(0);
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = asnFiltrosParams({ ...VACIO, expectedDesde: '', createdHasta: '' });
        expect(r.expectedDesde).toBeUndefined();
        expect(r.createdHasta).toBeUndefined();
    });

    it('cada rango de fecha es independiente: sólo el extremo puesto viaja', () => {
        const r = asnFiltrosParams({ ...VACIO, expectedDesde: '2026-01-01', receivedHasta: '2026-05-05' });
        expect(r.expectedDesde).toBe('2026-01-01');
        expect(r.expectedHasta).toBeUndefined();
        expect(r.receivedDesde).toBeUndefined();
        expect(r.receivedHasta).toBe('2026-05-05');
    });

    it('los textos vacíos no viajan pero un texto con espacios sí (no se recorta)', () => {
        expect(asnFiltrosParams({ ...VACIO, supplierName: ' ' }).supplierName).toBe(' ');
        expect(asnFiltrosParams({ ...VACIO, supplierName: '' }).supplierName).toBeUndefined();
    });
});
