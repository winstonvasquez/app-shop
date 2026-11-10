import { describe, expect, it } from 'vitest';
import { simboloMoneda, sumarPorMoneda } from './dashboard-tesoreria.params';

describe('dashboard-tesoreria.params', () => {
    it('simboloMoneda asume PEN por defecto', () => {
        expect(simboloMoneda()).toBe('S/');
        expect(simboloMoneda('USD')).toBe('$');
    });

    it('sumarPorMoneda no mezcla monedas y siempre incluye PEN', () => {
        expect(sumarPorMoneda([])).toEqual([{ moneda: 'PEN', monto: 0 }]);
        expect(sumarPorMoneda([
            { moneda: 'PEN', monto: 10 }, { moneda: 'USD', monto: 5 }, { monto: 2 },
        ])).toEqual([{ moneda: 'PEN', monto: 12 }, { moneda: 'USD', monto: 5 }]);
    });
});
