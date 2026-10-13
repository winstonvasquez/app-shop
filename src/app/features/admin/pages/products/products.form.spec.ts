import { describe, expect, it } from 'vitest';
import { construirProductRequest, productoConActivo, ProductFormRaw } from './products.form';
import { ProductResponse } from '@core/models/product.model';

const COMPLETO: ProductFormRaw = {
    nombre: 'Polo algodón',
    descripcion: '<p>Talla M</p>',
    precioBase: 39.9,
    marca: 'Andina',
    categoriaIds: [3, 8],
};

const MINIMO: ProductFormRaw = { nombre: 'Polo', precioBase: 10 };

describe('construirProductRequest', () => {
    it('con todo relleno y categorías cargadas manda el DTO completo', () => {
        expect(construirProductRequest(COMPLETO, 4, true)).toEqual({
            nombre: 'Polo algodón',
            descripcion: '<p>Talla M</p>',
            precioBase: 39.9,
            marca: 'Andina',
            companyId: 4,
            categoriaIds: [3, 8],
        });
    });

    it('sin opcionales: descripción y marca salen null, no undefined ni ""', () => {
        const dto = construirProductRequest(MINIMO, 1, true);
        expect(dto.descripcion).toBeNull();
        expect(dto.marca).toBeNull();
    });

    it('la cadena vacía se normaliza a null', () => {
        const dto = construirProductRequest({ ...MINIMO, descripcion: '', marca: '' }, 1, true);
        expect(dto.descripcion).toBeNull();
        expect(dto.marca).toBeNull();
    });

    it('categorías NO cargadas: se omite categoriaIds para no borrar las que tenga', () => {
        const dto = construirProductRequest(COMPLETO, 1, false);
        expect(dto.categoriaIds).toBeUndefined();
    });

    it('categorías cargadas y ninguna elegida: [] explícito = «quítale todas»', () => {
        expect(construirProductRequest({ ...MINIMO, categoriaIds: [] }, 1, true).categoriaIds).toEqual([]);
        expect(construirProductRequest({ ...MINIMO, categoriaIds: null }, 1, true).categoriaIds).toEqual([]);
        expect(construirProductRequest(MINIMO, 1, true).categoriaIds).toEqual([]);
    });

    it('un precio de 0 viaja tal cual (no lo pisa ningún default)', () => {
        expect(construirProductRequest({ ...MINIMO, precioBase: 0 }, 1, true).precioBase).toBe(0);
    });

    it('la empresa activa siempre viaja como companyId', () => {
        expect(construirProductRequest(MINIMO, 42, true).companyId).toBe(42);
    });
});

describe('productoConActivo', () => {
    const p = { id: 9, nombre: 'Polo', descripcion: '', precioBase: 10, stock: 0 } as ProductResponse;

    it('reenvía el producto con activo y sin categoriaIds', () => {
        const dto = productoConActivo(p, 4, false);
        expect(dto).toEqual({ nombre: 'Polo', descripcion: null, precioBase: 10, marca: null, companyId: 4, activo: false });
        expect(dto.categoriaIds).toBeUndefined();
    });
});
