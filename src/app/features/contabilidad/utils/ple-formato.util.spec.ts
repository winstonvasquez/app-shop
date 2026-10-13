import { describe, expect, it } from 'vitest';
import { formatFechaPLE, formatPeriodoPLE } from './ple-formato.util';

describe('formatPeriodoPLE', () => {
    it('traduce el nombre del periodo a AAAAMM00', () => {
        expect(formatPeriodoPLE('Marzo 2026')).toBe('20260300');
    });

    it('no distingue mayúsculas', () => {
        expect(formatPeriodoPLE('ENERO 2027')).toBe('20270100');
        expect(formatPeriodoPLE('diciembre 2025')).toBe('20251200');
    });

    it('cae a enero cuando el mes no está en la tabla', () => {
        // «Setiembre» (grafía peruana habitual) NO está en la tabla: ver observaciones.
        expect(formatPeriodoPLE('Setiembre 2026')).toBe('20260100');
    });

    it('cae al año 2026 cuando el nombre no trae año', () => {
        expect(formatPeriodoPLE('Julio')).toBe('20260700');
    });

    it('con nombre vacío devuelve el periodo por defecto', () => {
        expect(formatPeriodoPLE('')).toBe('20260100');
    });
});

describe('formatFechaPLE', () => {
    it('formatea una fecha con hora local como DD/MM/AAAA', () => {
        expect(formatFechaPLE('2026-03-15T10:30:00')).toBe('15/03/2026');
    });

    it('rellena con cero el día y el mes de un solo dígito', () => {
        expect(formatFechaPLE('2026-01-05T00:00:00')).toBe('05/01/2026');
    });

    it('devuelve cadena vacía si no hay fecha', () => {
        expect(formatFechaPLE('')).toBe('');
    });

    it('con una fecha ilegible NO cae al catch: emite NaN/NaN/NaN', () => {
        // `new Date('basura')` no lanza, devuelve Invalid Date — el try/catch es
        // inalcanzable. Se fija el comportamiento actual (ver observaciones).
        expect(formatFechaPLE('basura')).toBe('NaN/NaN/NaN');
    });
});
