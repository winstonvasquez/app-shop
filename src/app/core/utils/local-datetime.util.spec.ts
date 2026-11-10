import { describe, expect, it } from 'vitest';
import { fechaALocalDateTime, hoyLocalISO, mesLocalISO } from './local-datetime.util';

describe('fechaALocalDateTime', () => {
    it('sin hora actual agrega T00:00:00', () => {
        expect(fechaALocalDateTime('2026-10-12')).toBe('2026-10-12T00:00:00');
    });

    it('con hora actual usa la hora local de `ahora`', () => {
        expect(fechaALocalDateTime('2026-10-12', true, new Date(2026, 0, 1, 9, 5, 7))).toBe('2026-10-12T09:05:07');
    });

    it('vacía o con hora ya incluida se devuelve tal cual', () => {
        expect(fechaALocalDateTime('')).toBe('');
        expect(fechaALocalDateTime('2026-10-12T08:00:00', true)).toBe('2026-10-12T08:00:00');
    });
});

describe('hoyLocalISO / mesLocalISO', () => {
    it('a las 20:00 locales sigue siendo el día local (toISOString ya daría el siguiente en Lima)', () => {
        expect(hoyLocalISO(new Date(2026, 10, 9, 20, 0))).toBe('2026-11-09');
    });

    it('rellena mes y día de un dígito', () => {
        expect(hoyLocalISO(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
    });

    it('la última noche del mes sigue en ese mes', () => {
        expect(mesLocalISO(new Date(2026, 9, 31, 23, 30))).toBe('2026-10');
    });
});
