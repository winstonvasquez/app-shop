import { describe, expect, it } from 'vitest';
import { filtroDeUsuarios, FiltrosUsuarioCrudos } from './users.params';

/** Estado inicial de la pantalla: ningún filtro tocado. */
const VACIO: FiltrosUsuarioCrudos = {
    search: '', rolId: '', activo: '', tipoDocumento: '',
    fechaCreacionDesde: null, fechaCreacionHasta: null,
};

describe('filtroDeUsuarios', () => {
    it('con todos los filtros puestos convierte los tipos que el backend espera', () => {
        expect(filtroDeUsuarios({
            search: 'ana', rolId: '3', activo: 'true', tipoDocumento: 'DNI',
            fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
        })).toEqual({
            search: 'ana', rolId: 3, activo: true, tipoDocumento: 'DNI',
            fechaCreacionDesde: '2026-01-01', fechaCreacionHasta: '2026-01-31',
        });
    });

    it('sin nada elegido ningún filtro viaja: todos undefined', () => {
        const f = filtroDeUsuarios(VACIO);
        expect(f.search).toBeUndefined();
        expect(f.rolId).toBeUndefined();
        expect(f.activo).toBeUndefined();
        expect(f.tipoDocumento).toBeUndefined();
        expect(f.fechaCreacionDesde).toBeUndefined();
        expect(f.fechaCreacionHasta).toBeUndefined();
    });

    it('«false» filtra por dados de baja: NO se confunde con «sin elegir»', () => {
        expect(filtroDeUsuarios({ ...VACIO, activo: 'false' }).activo).toBe(false);
    });

    it('cualquier valor de activo distinto de "true" es false', () => {
        expect(filtroDeUsuarios({ ...VACIO, activo: 'TRUE' }).activo).toBe(false);
    });

    it('el rol llega como texto del select y sale numérico', () => {
        expect(filtroDeUsuarios({ ...VACIO, rolId: '12' }).rolId).toBe(12);
    });

    // El guard es `c.rolId ? …`, y `'0'` es una cadena NO vacía: pasa. Lo único que se descarta es
    // el `''` del select sin elegir. Se fija por escrito porque es fácil leerlo al revés.
    it('el rolId "0" viaja como 0; sólo el "" del select se descarta', () => {
        expect(filtroDeUsuarios({ ...VACIO, rolId: '0' }).rolId).toBe(0);
        expect(filtroDeUsuarios({ ...VACIO, rolId: '' }).rolId).toBeUndefined();
    });

    it('las fechas null de la pantalla se envían como undefined', () => {
        const f = filtroDeUsuarios({ ...VACIO, fechaCreacionDesde: '2026-05-01' });
        expect(f.fechaCreacionDesde).toBe('2026-05-01');
        expect(f.fechaCreacionHasta).toBeUndefined();
    });
});
