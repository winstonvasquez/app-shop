import { describe, expect, it } from 'vitest';
import { ReglaFormValue, debeAplicarCambioDeStatus, reglaReposicionPayload } from './replenishment-rules.form';

const BASE: ReglaFormValue = {
    almacenId: null, sku: 'SKU-1', productoNombre: '',
    reorderPoint: 5, reorderQuantity: 10,
    preferredSupplierName: '', maxUnitCost: null, autoCreatePo: false
};

describe('reglaReposicionPayload', () => {
    it('con todo relleno arma el payload completo', () => {
        expect(reglaReposicionPayload({
            almacenId: 'alm-1', sku: 'SKU-9', productoNombre: 'Tornillo',
            reorderPoint: 3, reorderQuantity: 20,
            preferredSupplierName: 'Acme', maxUnitCost: 15.5, autoCreatePo: true
        }, 'prod-uuid')).toEqual({
            almacenId: 'alm-1', sku: 'SKU-9', productoNombre: 'Tornillo',
            reorderPoint: 3, reorderQuantity: 20,
            preferredSupplierName: 'Acme', maxUnitCost: 15.5, autoCreatePo: true,
            productoId: 'prod-uuid'
        });
    });

    it('los opcionales sin definir NO viajan', () => {
        const p = reglaReposicionPayload(BASE, 'prod-uuid');
        expect(p.almacenId).toBeUndefined();
        expect(p.productoNombre).toBeUndefined();
        expect(p.preferredSupplierName).toBeUndefined();
        expect(p.maxUnitCost).toBeUndefined();
    });

    it('el status NUNCA forma parte del payload', () => {
        const p = reglaReposicionPayload({ ...BASE, status: 'PAUSED' }, 'prod-uuid');
        expect('status' in p).toBe(false);
    });

    it('reorderPoint 0 es un umbral legítimo y viaja', () => {
        // Con `|| undefined` desaparecería y la regla nunca dispararía por falta de umbral.
        expect(reglaReposicionPayload({ ...BASE, reorderPoint: 0 }, 'p').reorderPoint).toBe(0);
    });

    it('autoCreatePo false viaja (es "manual", no "sin definir")', () => {
        expect(reglaReposicionPayload({ ...BASE, autoCreatePo: false }, 'p').autoCreatePo).toBe(false);
    });

    it('maxUnitCost 0 viaja; null se omite', () => {
        expect(reglaReposicionPayload({ ...BASE, maxUnitCost: 0 }, 'p').maxUnitCost).toBe(0);
        expect(reglaReposicionPayload({ ...BASE, maxUnitCost: null }, 'p').maxUnitCost).toBeUndefined();
    });

    it('el productoId entra por parámetro, no del formulario', () => {
        expect(reglaReposicionPayload(BASE, 'otro-uuid').productoId).toBe('otro-uuid');
    });
});

describe('debeAplicarCambioDeStatus', () => {
    it('en alta nunca se aplica, aunque el valor difiera', () => {
        expect(debeAplicarCambioDeStatus(false, 'PAUSED', 'ACTIVE')).toBe(false);
    });

    it('en edición se aplica sólo si cambió', () => {
        expect(debeAplicarCambioDeStatus(true, 'PAUSED', 'ACTIVE')).toBe(true);
        expect(debeAplicarCambioDeStatus(true, 'ACTIVE', 'ACTIVE')).toBe(false);
    });

    it('un status ausente o vacío no dispara la llamada', () => {
        expect(debeAplicarCambioDeStatus(true, null, 'ACTIVE')).toBe(false);
        expect(debeAplicarCambioDeStatus(true, undefined, 'ACTIVE')).toBe(false);
        expect(debeAplicarCambioDeStatus(true, '', 'ACTIVE')).toBe(false);
    });
});
