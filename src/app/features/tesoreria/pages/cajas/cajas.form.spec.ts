import { describe, expect, it } from 'vitest';
import { construirAbrirRequest, diferenciaMonto, textoDiferenciaCierre } from './cajas.form';

describe('diferenciaMonto', () => {
    it('redondea a centavos', () => expect(diferenciaMonto(0.3, 0.2)).toBe(0.1));
    it('sin monto digitado es null', () => expect(diferenciaMonto(null, 10)).toBeNull());
    it('sin saldo de sistema lo toma como 0', () => expect(diferenciaMonto(5, undefined)).toBe(5));
});

describe('textoDiferenciaCierre', () => {
    it('distingue cuadre, sobrante y faltante', () => {
        expect(textoDiferenciaCierre(0)).toBe('la caja cuadra');
        expect(textoDiferenciaCierre(3)).toBe('sobrante');
        expect(textoDiferenciaCierre(-3)).toBe('faltante');
    });
});

describe('construirAbrirRequest', () => {
    it('con el saldo de cierre no pide ajuste aunque venga confirmado', () => {
        expect(construirAbrirRequest(120, 120, true)).toEqual({ saldoInicial: 120, confirmarAjuste: false });
    });
    it('con otro monto sin confirmar manda false (el backend responderá 409)', () => {
        expect(construirAbrirRequest(100, 120, false).confirmarAjuste).toBe(false);
    });
    it('con otro monto confirmado manda confirmarAjuste=true', () => {
        expect(construirAbrirRequest(100, 120, true)).toEqual({ saldoInicial: 100, confirmarAjuste: true });
    });
});
