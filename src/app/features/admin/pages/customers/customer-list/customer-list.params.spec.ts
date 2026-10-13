import { describe, expect, it } from 'vitest';
import { filtrosDeClientes, FiltrosClienteCrudos } from './customer-list.params';

/** Estado inicial de la pantalla: ningún filtro tocado. */
const VACIO: FiltrosClienteCrudos = {
    tipoCliente: '', condicionPago: '', tipoDocumento: '', segmentoId: '',
    activo: '', conCredito: '',
    fechaCreacionDesde: undefined, fechaCreacionHasta: undefined,
};

describe('filtrosDeClientes', () => {
    it('con todos los filtros puestos los pasa tal cual', () => {
        expect(filtrosDeClientes({
            tipoCliente: 'PERSONA_JURIDICA', condicionPago: 'CREDITO_30', tipoDocumento: 'RUC',
            segmentoId: '4', activo: 'true', conCredito: 'true',
            fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
        })).toEqual({
            tipoCliente: 'PERSONA_JURIDICA', condicionPago: 'CREDITO_30', tipoDocumento: 'RUC',
            segmentoId: '4', activo: 'true', conCredito: 'true',
            fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
        });
    });

    it('sin nada elegido ningún select viaja: todos undefined', () => {
        const f = filtrosDeClientes(VACIO);
        expect(f.tipoCliente).toBeUndefined();
        expect(f.condicionPago).toBeUndefined();
        expect(f.tipoDocumento).toBeUndefined();
        expect(f.segmentoId).toBeUndefined();
        expect(f.activo).toBeUndefined();
        expect(f.conCredito).toBeUndefined();
    });

    it('«false» es una elección del usuario, no un filtro sin elegir', () => {
        const f = filtrosDeClientes({ ...VACIO, activo: 'false', conCredito: 'false' });
        expect(f.activo).toBe('false');
        expect(f.conCredito).toBe('false');
    });

    it('el segmento 0 no existe, pero un id no vacío sale íntegro', () => {
        expect(filtrosDeClientes({ ...VACIO, segmentoId: '0' }).segmentoId).toBe('0');
    });

    it('las fechas ausentes se propagan como undefined', () => {
        const f = filtrosDeClientes(VACIO);
        expect(f.fechaCreacionDesde).toBeUndefined();
        expect(f.fechaCreacionHasta).toBeUndefined();
    });

    it('un rango abierto por un extremo conserva ese extremo', () => {
        const f = filtrosDeClientes({ ...VACIO, fechaCreacionHasta: '2026-06-30' });
        expect(f.fechaCreacionHasta).toBe('2026-06-30');
        expect(f.fechaCreacionDesde).toBeUndefined();
    });
});
