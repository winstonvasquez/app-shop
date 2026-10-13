import { describe, expect, it } from 'vitest';
import { toHttpParams } from './http-params.util';

describe('toHttpParams', () => {
    it('omite undefined, null y cadena vacía', () => {
        const p = toHttpParams({ a: undefined, b: null, c: '', d: 'x' });
        expect(p.toString()).toBe('d=x');
    });

    it('SÍ envía 0 y false — la diferencia deliberada con el `if (x)` que sustituye', () => {
        const p = toHttpParams({ page: 0, activo: false });
        expect(p.get('page')).toBe('0');
        expect(p.get('activo')).toBe('false');
    });

    it('repite el parámetro para un array y descarta sus huecos', () => {
        const p = toHttpParams({ estado: ['A', '', null, 'B'] });
        expect(p.getAll('estado')).toEqual(['A', 'B']);
    });

    it('tolera fuente nula', () => {
        expect(toHttpParams(null).keys()).toEqual([]);
    });
});
