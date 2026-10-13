import { describe, expect, it } from 'vitest';
import { categoriaConActivo, construirCategoryRequest, estaActivo } from './categories.form';
import { CategoryResponse } from '@core/models/category.model';

describe('construirCategoryRequest', () => {
    it('con padre manda padreId numérico', () => {
        const dto = construirCategoryRequest({ nombre: 'Polos', nivel: 1, padreId: '7' });
        expect(dto.padreId).toBe(7);
    });

    it('sin padre OMITE padreId (no null)', () => {
        const dto = construirCategoryRequest({ nombre: 'Ropa', nivel: 0, padreId: null });
        expect(dto.padreId).toBeUndefined();
    });
});

describe('categoriaConActivo', () => {
    const fila: CategoryResponse = { id: 1, nombre: 'Ropa', descripcion: '', nivel: 0 };

    it('reenvía la fila con activo invertido', () => {
        expect(categoriaConActivo(fila, false)).toEqual({
            nombre: 'Ropa', descripcion: '', imagenUrl: undefined, nivel: 0, padreId: undefined, activo: false,
        });
    });
});

describe('estaActivo', () => {
    it('usa el valor de la fila si llega', () => expect(estaActivo(false, null)).toBe(false));
    it('con el filtro en «No» deduce inactivo', () => expect(estaActivo(undefined, false)).toBe(false));
    it('sin dato ni filtro deduce activo', () => expect(estaActivo(undefined, null)).toBe(true));
});
