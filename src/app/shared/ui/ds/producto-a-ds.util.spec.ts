import { describe, expect, it } from 'vitest';
import type { ProductResponse } from '@core/models/product.model';
import { mapearProductoADsProduct } from './producto-a-ds.util';

const producto = (extra: Partial<ProductResponse> = {}) =>
    ({ id: 1, nombre: 'Polo', precioBase: 120, ...extra }) as ProductResponse;

describe('mapearProductoADsProduct', () => {
    it('traduce los campos directos del producto', () => {
        const d = mapearProductoADsProduct(producto({ originalPrice: 150, rating: 4.5, salesCount: '30', stock: 12 }));
        expect(d).toMatchObject({ id: 1, name: 'Polo', now: 120, was: 150, rating: 4.5, sold: '30', stock: 12 });
    });

    // El orden de la insignia ES la regla de negocio: sólo se pinta una por tarjeta.
    it.each([
        [{ promocionEtiqueta: '-30%', badge: 'TOP', discount: '-10%', stock: 1 }, undefined, '-30%'],
        [{ badge: 'TOP', discount: '-10%', stock: 1 }, undefined, 'TOP'],
        [{ discount: '-10%', stock: 1 }, 'NUEVO', 'NUEVO'],
        [{ discount: '-10%', stock: 1 }, undefined, '-10%'],
        [{ stock: 1 }, undefined, 'POCAS'],
        [{ stock: 50 }, undefined, undefined],
    ] as [Partial<ProductResponse>, string | undefined, string | undefined][])(
        'la insignia sigue el orden promoción → producto → sección → descuento → stock bajo (%#)',
        (campos, badgeDeSeccion, esperada) => {
            expect(mapearProductoADsProduct(producto(campos), { badgeDeSeccion }).badge).toBe(esperada);
        });

    it('un promocionEtiqueta nulo NO pisa al badge del producto (por eso la cadena usa ??)', () => {
        expect(mapearProductoADsProduct(producto({ promocionEtiqueta: undefined, badge: 'TOP' })).badge).toBe('TOP');
    });

    it('un descuento en cadena vacía no cuenta como insignia', () => {
        expect(mapearProductoADsProduct(producto({ discount: '', stock: 2 })).badge).toBe('POCAS');
    });

    it('un producto sin stock informado no se anuncia como «pocas unidades»', () => {
        expect(mapearProductoADsProduct(producto()).badge).toBeUndefined();
    });

    it('el envío gratis se deduce del precio, desde S/ 99', () => {
        expect(mapearProductoADsProduct(producto({ precioBase: 99 })).shipFree).toBe(true);
        expect(mapearProductoADsProduct(producto({ precioBase: 98.99 })).shipFree).toBe(false);
        expect(mapearProductoADsProduct(producto({ precioBase: undefined })).shipFree).toBe(false);
    });

    it('el sello de vendedor destacado sólo aparece si starSeller', () => {
        expect(mapearProductoADsProduct(producto({ starSeller: true })).tag).toBe('Recomendado');
        expect(mapearProductoADsProduct(producto()).tag).toBeUndefined();
    });

    it('la imagen es la principal; si ninguna lo es o su url viene vacía, la primera', () => {
        const imgs = (v: unknown) => producto({ imagenes: v as ProductResponse['imagenes'] });
        expect(mapearProductoADsProduct(imgs([{ url: 'a' }, { url: 'b', esPrincipal: true }])).image).toBe('b');
        expect(mapearProductoADsProduct(imgs([{ url: 'a' }, { url: 'b' }])).image).toBe('a');
        // El respaldo es SIEMPRE la primera imagen, aunque la principal con url vacía sea otra.
        expect(mapearProductoADsProduct(imgs([{ url: 'a' }, { url: '', esPrincipal: true }])).image).toBe('a');
        expect(mapearProductoADsProduct(producto()).image).toBeUndefined();
    });

    // Caso límite heredado, fijado por escrito: si la ÚNICA candidata al respaldo es ella misma y
    // trae la url vacía, la tarjeta recibe '' y pinta su propio marcador de posición.
    it('una principal con url vacía en primera posición deja la imagen vacía, no undefined', () => {
        const p = producto({ imagenes: [{ url: '', esPrincipal: true }] as ProductResponse['imagenes'] });
        expect(mapearProductoADsProduct(p).image).toBe('');
    });

    it('`extra` se aplica al final y pisa cualquier campo calculado', () => {
        const d = mapearProductoADsProduct(producto({ badge: 'TOP' }), { extra: { badge: 'FLASH', cat: 'Ropa' } });
        expect(d.badge).toBe('FLASH');
        expect(d.cat).toBe('Ropa');
    });
});
