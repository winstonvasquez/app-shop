import { describe, it, expect } from 'vitest';
import type { DsProduct } from '@shared/ui/ds';
import { conEnvioGratis, costoEnvioAplicable, estadoEnvioGratis } from './envio-gratis';

describe('estadoEnvioGratis', () => {
    it('sin umbral (null, undefined, 0) no promete nada', () => {
        expect(estadoEnvioGratis(500, null)).toBeNull();
        expect(estadoEnvioGratis(500, undefined)).toBeNull();
        expect(estadoEnvioGratis(500, 0)).toBeNull();
    });
    it('gratis justo en el umbral, igual que el servidor (>=)', () => {
        expect(estadoEnvioGratis(99, 99)).toEqual({ gratis: true, falta: 0, progreso: 100 });
    });
    it('falta con céntimos exactos y sin ruido de coma flotante', () => {
        const e = estadoEnvioGratis(98.9, 99);
        expect(e?.gratis).toBe(false);
        expect(e?.falta).toBe(0.1);
        expect(estadoEnvioGratis(0, 99)?.progreso).toBe(0);
    });
});

describe('costoEnvioAplicable', () => {
    it('cobra la tarifa bajo el umbral y 0 al alcanzarlo (neto de cupón)', () => {
        expect(costoEnvioAplicable(10, 98.99, 99)).toBe(10);
        expect(costoEnvioAplicable(10, 150 - 60, 99)).toBe(10);
        expect(costoEnvioAplicable(10, 150, 99)).toBe(0);
    });
    it('regla apagada: siempre la tarifa', () => expect(costoEnvioAplicable(10, 1000, null)).toBe(10));
});

describe('conEnvioGratis', () => {
    const p = (now: number) => ({ id: 1, name: 'x', now } as DsProduct);
    it('marca por precio real y apaga todo sin umbral', () => {
        expect(conEnvioGratis([p(120), p(50)], 99).map(x => x.shipFree)).toEqual([true, false]);
        expect(conEnvioGratis([p(120)], null)[0].shipFree).toBe(false);
    });
});
