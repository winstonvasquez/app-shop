import { describe, expect, it } from 'vitest';
import { CartItem } from '../services/cart.service';
import { agregarItem, debeLimpiarPorCambioDeEmpresa, lineasParaCupon, ProductoParaCarrito } from './carrito.util';

function item(parcial: Partial<CartItem> = {}): CartItem {
    return {
        productId: 1,
        name: 'Polo',
        price: 30,
        quantity: 1,
        image: 'polo.jpg',
        selected: true,
        ...parcial,
    };
}

function producto(parcial: Partial<ProductoParaCarrito> = {}): ProductoParaCarrito {
    return { id: 1, name: 'Polo', price: 30, image: 'polo.jpg', ...parcial };
}

describe('debeLimpiarPorCambioDeEmpresa', () => {
    it('la primera lectura de la sesión NUNCA limpia (si no se borra el carrito recuperado)', () => {
        expect(debeLimpiarPorCambioDeEmpresa(undefined, 4)).toBe(false);
        expect(debeLimpiarPorCambioDeEmpresa(undefined, null)).toBe(false);
    });

    it('sin cambio de empresa no limpia', () => {
        expect(debeLimpiarPorCambioDeEmpresa(4, 4)).toBe(false);
        expect(debeLimpiarPorCambioDeEmpresa(null, null)).toBe(false);
    });

    it('el invitado que inicia sesión conserva su carrito', () => {
        expect(debeLimpiarPorCambioDeEmpresa(null, 4)).toBe(false);
    });

    it('cambiar de empresa activa limpia (los productId de una no existen en la otra)', () => {
        expect(debeLimpiarPorCambioDeEmpresa(4, 7)).toBe(true);
    });

    it('cerrar sesión limpia, para que el siguiente usuario no herede el carrito', () => {
        expect(debeLimpiarPorCambioDeEmpresa(4, null)).toBe(true);
    });

    it('la empresa 0 se trata como empresa, no como «sin sesión»', () => {
        expect(debeLimpiarPorCambioDeEmpresa(0, 4)).toBe(true);
        expect(debeLimpiarPorCambioDeEmpresa(0, 0)).toBe(false);
    });
});

describe('agregarItem', () => {
    it('sobre un carrito vacío crea la línea con los valores por defecto', () => {
        expect(agregarItem([], producto())).toEqual([{
            productId: 1,
            variantId: undefined,
            sku: undefined,
            variantName: undefined,
            name: 'Polo',
            description: undefined,
            price: 30,
            quantity: 1,
            stock: undefined,
            image: 'polo.jpg',
            selected: true,
        }]);
    });

    it('traslada todos los campos opcionales cuando vienen', () => {
        const r = agregarItem([], producto({
            variantId: 9, sku: 'SKU-9', variantName: 'Talla M',
            description: 'Algodón', quantity: 3, stock: 12,
        }));
        expect(r[0]).toMatchObject({
            variantId: 9, sku: 'SKU-9', variantName: 'Talla M',
            description: 'Algodón', quantity: 3, stock: 12,
        });
    });

    it('vuelve a agregar el mismo producto sumando cantidades', () => {
        const r = agregarItem([item({ quantity: 2 })], producto({ quantity: 3 }));
        expect(r).toHaveLength(1);
        expect(r[0].quantity).toBe(5);
    });

    it('re-seleccionar es parte del alta: agregar reactiva una línea deseleccionada', () => {
        const r = agregarItem([item({ selected: false })], producto());
        expect(r[0].selected).toBe(true);
    });

    it('dos variantes del mismo producto son dos líneas distintas', () => {
        const r = agregarItem([item({ variantId: 9 })], producto({ variantId: 10 }));
        expect(r).toHaveLength(2);
    });

    it('la misma variante se agrupa', () => {
        const r = agregarItem([item({ variantId: 9, quantity: 1 })], producto({ variantId: 9, quantity: 2 }));
        expect(r).toHaveLength(1);
        expect(r[0].quantity).toBe(3);
    });

    it('el producto SIN variante no se agrupa con una línea que sí la tiene', () => {
        const r = agregarItem([item({ productId: 1, variantId: 9 })], producto({ id: 1 }));
        expect(r).toHaveLength(2);
        expect(r[1].variantId).toBeUndefined();
    });

    it('agregar una variante ignora el productId: agrupa por variante aunque el producto difiera', () => {
        const r = agregarItem([item({ productId: 1, variantId: 9 })], producto({ id: 2, variantId: 9 }));
        expect(r).toHaveLength(1);
    });

    it('una cantidad 0 explícita se respeta y no cae al 1 por defecto', () => {
        expect(agregarItem([], producto({ quantity: 0 }))[0].quantity).toBe(0);
        expect(agregarItem([item({ quantity: 5 })], producto({ quantity: 0 }))[0].quantity).toBe(5);
    });

    it('no muta la lista de entrada', () => {
        const original = [item({ quantity: 1 })];
        agregarItem(original, producto({ quantity: 4 }));
        expect(original[0].quantity).toBe(1);
    });

    it('deja intactas las líneas que no coinciden', () => {
        const r = agregarItem([item({ productId: 1 }), item({ productId: 2, quantity: 7 })], producto({ id: 1 }));
        expect(r[1]).toMatchObject({ productId: 2, quantity: 7 });
    });
});

describe('lineasParaCupon', () => {
    it('sólo manda las líneas seleccionadas, con subtotal = precio × cantidad', () => {
        const lineas = lineasParaCupon([
            item({ productId: 1, price: 30, quantity: 2 }),
            item({ productId: 2, price: 10, quantity: 1, selected: false }),
        ]);
        expect(lineas).toEqual([{ productoId: 1, subtotal: 60 }]);
    });
});
