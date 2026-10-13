import { describe, expect, it } from 'vitest';
import { fechaALocalDateTime } from './local-datetime.util';

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
