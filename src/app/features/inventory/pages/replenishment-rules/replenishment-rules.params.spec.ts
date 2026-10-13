import { describe, expect, it } from 'vitest';
import { ReglasFiltrosUI, reglasFiltrosParams } from './replenishment-rules.params';

const VACIO: ReglasFiltrosUI = {
    q: '', status: '', almacenId: '', autoCreatePo: '',
    lastTriggeredAtDesde: null, lastTriggeredAtHasta: null,
    lastPoCreatedAtDesde: null, lastPoCreatedAtHasta: null
};

describe('reglasFiltrosParams', () => {
    it('con todos los filtros puestos los traslada tal cual', () => {
        expect(reglasFiltrosParams({
            q: 'SKU-1', status: 'ACTIVE', almacenId: 'alm-uuid', autoCreatePo: 'true',
            lastTriggeredAtDesde: '2026-01-01', lastTriggeredAtHasta: '2026-01-31',
            lastPoCreatedAtDesde: '2026-02-01', lastPoCreatedAtHasta: '2026-02-28'
        })).toEqual({
            q: 'SKU-1', status: 'ACTIVE', almacenId: 'alm-uuid', autoCreatePo: true,
            lastTriggeredAtDesde: '2026-01-01', lastTriggeredAtHasta: '2026-01-31',
            lastPoCreatedAtDesde: '2026-02-01', lastPoCreatedAtHasta: '2026-02-28'
        });
    });

    it('sin nada elegido, TODOS los parámetros salen undefined', () => {
        const r = reglasFiltrosParams(VACIO);
        expect(r.q).toBeUndefined();
        expect(r.status).toBeUndefined();
        expect(r.almacenId).toBeUndefined();
        expect(r.autoCreatePo).toBeUndefined();
        expect(r.lastTriggeredAtDesde).toBeUndefined();
        expect(r.lastTriggeredAtHasta).toBeUndefined();
        expect(r.lastPoCreatedAtDesde).toBeUndefined();
        expect(r.lastPoCreatedAtHasta).toBeUndefined();
    });

    it('el modo de reposición distingue "manual" de "sin filtrar"', () => {
        // El caso que rompe si alguien lo escribe con `|| undefined`: 'false' debe viajar
        // como false (reglas manuales), no desaparecer.
        expect(reglasFiltrosParams({ ...VACIO, autoCreatePo: 'false' }).autoCreatePo).toBe(false);
        expect(reglasFiltrosParams({ ...VACIO, autoCreatePo: 'true' }).autoCreatePo).toBe(true);
        expect(reglasFiltrosParams({ ...VACIO, autoCreatePo: '' }).autoCreatePo).toBeUndefined();
    });

    it('el almacén viaja como cadena (es un UUID, no un id numérico)', () => {
        expect(reglasFiltrosParams({ ...VACIO, almacenId: '7f3c-uuid' }).almacenId).toBe('7f3c-uuid');
    });

    it('una fecha en cadena vacía cuenta como no elegida', () => {
        const r = reglasFiltrosParams({ ...VACIO, lastTriggeredAtDesde: '', lastPoCreatedAtHasta: '' });
        expect(r.lastTriggeredAtDesde).toBeUndefined();
        expect(r.lastPoCreatedAtHasta).toBeUndefined();
    });

    it('cada rango de fecha es independiente: sólo el extremo puesto viaja', () => {
        const r = reglasFiltrosParams({ ...VACIO, lastTriggeredAtDesde: '2026-05-01', lastPoCreatedAtHasta: '2026-06-01' });
        expect(r.lastTriggeredAtDesde).toBe('2026-05-01');
        expect(r.lastTriggeredAtHasta).toBeUndefined();
        expect(r.lastPoCreatedAtDesde).toBeUndefined();
        expect(r.lastPoCreatedAtHasta).toBe('2026-06-01');
    });
});
