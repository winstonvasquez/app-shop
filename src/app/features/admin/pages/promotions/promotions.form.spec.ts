import { describe, expect, it } from 'vitest';
import { construirPromocionRequest, PromocionFormRaw } from './promotions.form';

const BASE: PromocionFormRaw = {
    nombre: 'Verano',
    descripcion: null,
    tipo: 'PORCENTAJE',
    valor: 10,
    alcance: 'CARRITO',
    productoId: null,
    categoriaId: null,
    montoMinimo: null,
    codigoCupon: null,
    limiteUsos: null,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-03-31',
    activo: true,
};

describe('construirPromocionRequest', () => {
    it('alcance PRODUCTO conserva el producto y anula categoría y monto mínimo', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'PRODUCTO', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.productoId).toBe(55);
        expect(dto.categoriaId).toBeNull();
        expect(dto.montoMinimo).toBeNull();
    });

    it('alcance CATEGORIA conserva la categoría y anula producto y monto mínimo', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'CATEGORIA', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.categoriaId).toBe(9);
        expect(dto.productoId).toBeNull();
        expect(dto.montoMinimo).toBeNull();
    });

    it('alcance CARRITO conserva el monto mínimo y anula producto y categoría', () => {
        const dto = construirPromocionRequest({
            ...BASE, alcance: 'CARRITO', productoId: 55, categoriaId: 9, montoMinimo: 100,
        });
        expect(dto.montoMinimo).toBe(100);
        expect(dto.productoId).toBeNull();
        expect(dto.categoriaId).toBeNull();
    });

    it('el categoriaId del select llega como texto y se envía numérico', () => {
        const dto = construirPromocionRequest({ ...BASE, alcance: 'CATEGORIA', categoriaId: '12' });
        expect(dto.categoriaId).toBe(12);
    });

    it('alcance CATEGORIA sin categoría elegida manda null, no NaN', () => {
        const dto = construirPromocionRequest({ ...BASE, alcance: 'CATEGORIA', categoriaId: null });
        expect(dto.categoriaId).toBeNull();
    });

    it('descripción y cupón vacíos se omiten (undefined), no viajan como ""', () => {
        const dto = construirPromocionRequest({ ...BASE, descripcion: '', codigoCupon: '' });
        expect(dto.descripcion).toBeUndefined();
        expect(dto.codigoCupon).toBeUndefined();
    });

    it('sin límite de usos el campo se omite', () => {
        expect(construirPromocionRequest({ ...BASE, limiteUsos: null }).limiteUsos).toBeUndefined();
    });

    it('un límite de 0 usos NO se pisa: es un valor legítimo distinto de «sin límite»', () => {
        expect(construirPromocionRequest({ ...BASE, limiteUsos: 0 }).limiteUsos).toBe(0);
    });

    it('activo false se respeta; null cae al default true', () => {
        expect(construirPromocionRequest({ ...BASE, activo: false }).activo).toBe(false);
        expect(construirPromocionRequest({ ...BASE, activo: null }).activo).toBe(true);
    });

    it('nunca envía usosActuales ni estado: son derivados del backend', () => {
        const dto = construirPromocionRequest(BASE);
        expect('usosActuales' in dto).toBe(false);
        expect('estado' in dto).toBe(false);
    });

    it('un monto mínimo de 0 en CARRITO viaja tal cual', () => {
        expect(construirPromocionRequest({ ...BASE, alcance: 'CARRITO', montoMinimo: 0 }).montoMinimo).toBe(0);
    });
});
