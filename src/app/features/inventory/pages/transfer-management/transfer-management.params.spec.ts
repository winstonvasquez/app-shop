import { describe, expect, it } from 'vitest';
import { TransferFiltrosUI, transferFiltrosParams } from './transfer-management.params';

const VACIO: TransferFiltrosUI = {
    q: '', status: '', sourceWarehouseId: '', destinationWarehouseId: '',
    requestDateDesde: null, requestDateHasta: null,
    sentDateDesde: null, sentDateHasta: null,
    receivedDateDesde: null, receivedDateHasta: null
};

describe('transferFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(transferFiltrosParams({
            q: 'TR-9', status: 'ENVIADA', sourceWarehouseId: '1', destinationWarehouseId: '2',
            requestDateDesde: '2026-01-01', requestDateHasta: '2026-01-31',
            sentDateDesde: '2026-02-01', sentDateHasta: '2026-02-28',
            receivedDateDesde: '2026-03-01', receivedDateHasta: '2026-03-31'
        })).toEqual({
            q: 'TR-9', status: 'ENVIADA', sourceWarehouseId: 1, destinationWarehouseId: 2,
            requestDateDesde: '2026-01-01', requestDateHasta: '2026-01-31',
            sentDateDesde: '2026-02-01', sentDateHasta: '2026-02-28',
            receivedDateDesde: '2026-03-01', receivedDateHasta: '2026-03-31'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = transferFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.status).toBeUndefined();
        expect(r.sourceWarehouseId).toBeUndefined();
        expect(r.destinationWarehouseId).toBeUndefined();
        expect(r.requestDateDesde).toBeUndefined();
        expect(r.requestDateHasta).toBeUndefined();
        expect(r.sentDateDesde).toBeUndefined();
        expect(r.sentDateHasta).toBeUndefined();
        expect(r.receivedDateDesde).toBeUndefined();
        expect(r.receivedDateHasta).toBeUndefined();
    });

    it('origen y destino son independientes', () => {
        const soloOrigen = transferFiltrosParams({ ...VACIO, sourceWarehouseId: '4' });
        expect(soloOrigen.sourceWarehouseId).toBe(4);
        expect(soloOrigen.destinationWarehouseId).toBeUndefined();

        const soloDestino = transferFiltrosParams({ ...VACIO, destinationWarehouseId: '7' });
        expect(soloDestino.sourceWarehouseId).toBeUndefined();
        expect(soloDestino.destinationWarehouseId).toBe(7);
    });

    it('los almacenes viajan como número, no como la cadena del <select>', () => {
        const r = transferFiltrosParams({ ...VACIO, sourceWarehouseId: '10', destinationWarehouseId: '11' });
        expect(r.sourceWarehouseId).toBe(10);
        expect(r.destinationWarehouseId).toBe(11);
    });

    it('almacén "0" es un id legítimo y NO se descarta', () => {
        expect(transferFiltrosParams({ ...VACIO, sourceWarehouseId: '0' }).sourceWarehouseId).toBe(0);
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = transferFiltrosParams({ ...VACIO, requestDateDesde: '', sentDateHasta: '' });
        expect(r.requestDateDesde).toBeUndefined();
        expect(r.sentDateHasta).toBeUndefined();
    });

    it('cada rango de fecha es independiente: sólo el extremo puesto viaja', () => {
        const r = transferFiltrosParams({ ...VACIO, sentDateDesde: '2026-06-01', receivedDateHasta: '2026-07-01' });
        expect(r.sentDateDesde).toBe('2026-06-01');
        expect(r.sentDateHasta).toBeUndefined();
        expect(r.receivedDateDesde).toBeUndefined();
        expect(r.receivedDateHasta).toBe('2026-07-01');
    });
});
