import { describe, expect, it } from 'vitest';
import { LoteFormValue, lotePayload } from './lot-management.form';

const BASE: LoteFormValue = {
    sku: 'SKU-1', loteNumero: 'L-001',
    fechaFabricacion: '', fechaVencimiento: '',
    cantidadInicial: 100, cantidadActual: 40,
    proveedorNombre: '', notas: '', activo: true
};

describe('lotePayload', () => {
    it('con todo relleno arma el payload completo (en edición)', () => {
        expect(lotePayload({
            sku: 'SKU-9', loteNumero: 'L-9',
            fechaFabricacion: '2025-01-01', fechaVencimiento: '2026-01-01',
            cantidadInicial: 50, cantidadActual: 10,
            proveedorNombre: 'Acme', notas: 'refrigerado', activo: true
        }, 'prod-uuid', true)).toEqual({
            productoId: 'prod-uuid', sku: 'SKU-9', loteNumero: 'L-9',
            fechaFabricacion: '2025-01-01', fechaVencimiento: '2026-01-01',
            cantidadInicial: 50, proveedorNombre: 'Acme', notas: 'refrigerado',
            activo: true
        });
    });

    it('cantidadActual NUNCA viaja: la deriva el backend', () => {
        expect('cantidadActual' in lotePayload(BASE, 'p', true)).toBe(false);
        expect('cantidadActual' in lotePayload(BASE, 'p', false)).toBe(false);
    });

    it('activo sólo viaja en edición', () => {
        expect('activo' in lotePayload(BASE, 'p', false)).toBe(false);
        expect(lotePayload(BASE, 'p', true).activo).toBe(true);
    });

    it('en edición, activo false viaja (es la vía para dar de baja)', () => {
        expect(lotePayload({ ...BASE, activo: false }, 'p', true).activo).toBe(false);
    });

    it('las fechas y textos opcionales en blanco NO viajan', () => {
        const p = lotePayload(BASE, 'p', false);
        expect(p.fechaFabricacion).toBeUndefined();
        expect(p.fechaVencimiento).toBeUndefined();
        expect(p.proveedorNombre).toBeUndefined();
        expect(p.notas).toBeUndefined();
    });

    it('la cantidad inicial se normaliza a número', () => {
        expect(lotePayload({ ...BASE, cantidadInicial: '25' }, 'p', false).cantidadInicial).toBe(25);
    });

    it('cantidadInicial 0 es válida y viaja', () => {
        expect(lotePayload({ ...BASE, cantidadInicial: 0 }, 'p', false).cantidadInicial).toBe(0);
    });

    it('sku y loteNumero viajan siempre (identifican el lote)', () => {
        const p = lotePayload(BASE, 'p', true);
        expect(p.sku).toBe('SKU-1');
        expect(p.loteNumero).toBe('L-001');
        expect(p.productoId).toBe('p');
    });
});
