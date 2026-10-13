import { describe, expect, it } from 'vitest';
import type { ProductDetail } from '@features/products/models/product-detail.model';
import { ItemDeHistorial, agregarAHistorial, itemDeHistorial } from './historial-navegacion.util';

function producto(extra: Partial<ProductDetail> = {}): ProductDetail {
    return { id: 7, nombre: 'Polo pima', precioBase: 120, images: [], ...extra } as ProductDetail;
}

function item(id: number): ItemDeHistorial {
    return { id, name: 'p' + id, image: '', price: 10, slug: id };
}

describe('itemDeHistorial', () => {
    it('guarda lo que la tarjeta del historial necesita pintar', () => {
        const p = producto({ images: [{ url: '/a.jpg' }, { url: '/b.jpg' }] as ProductDetail['images'] });
        expect(itemDeHistorial({ ...p, slug: 'polo-pima' } as ProductDetail)).toEqual({
            id: 7, name: 'Polo pima', image: '/a.jpg', price: 120, slug: 'polo-pima',
        });
    });

    it('sin imágenes guarda cadena vacía, nunca undefined', () => {
        expect(itemDeHistorial(producto()).image).toBe('');
        expect(itemDeHistorial(producto({ images: undefined })).image).toBe('');
    });

    it('una primera imagen sin url tampoco deja el campo en undefined', () => {
        const p = producto({ images: [{ url: undefined }] as unknown as ProductDetail['images'] });
        expect(itemDeHistorial(p).image).toBe('');
    });

    it('sin slug del backend cae al id, que también resuelve la ficha', () => {
        expect(itemDeHistorial(producto()).slug).toBe(7);
    });

    it('un slug vacío se conserva tal cual: sólo el ausente cae al id', () => {
        expect(itemDeHistorial({ ...producto(), slug: '' } as ProductDetail).slug).toBe('');
    });
});

describe('agregarAHistorial', () => {
    it('sobre un historial vacío deja sólo el producto visto', () => {
        expect(agregarAHistorial([], item(1))).toEqual([item(1)]);
    });

    it('el último visto va al frente y el resto conserva su orden', () => {
        expect(agregarAHistorial([item(1), item(2)], item(3)).map((h) => h.id)).toEqual([3, 1, 2]);
    });

    it('volver a ver un producto lo sube al frente sin duplicarlo', () => {
        expect(agregarAHistorial([item(1), item(2), item(3)], item(3)).map((h) => h.id)).toEqual([3, 1, 2]);
    });

    it('el dedupe es por id, así que la entrada nueva pisa los datos viejos', () => {
        const viejo = { ...item(3), name: 'nombre viejo' };
        const nuevo = { ...item(3), name: 'nombre nuevo' };
        expect(agregarAHistorial([viejo], nuevo)).toEqual([nuevo]);
    });

    it('recorta a 20 entradas: el más antiguo se olvida', () => {
        const previo = Array.from({ length: 20 }, (_, i) => item(i + 1));
        const salida = agregarAHistorial(previo, item(99));
        expect(salida).toHaveLength(20);
        expect(salida[0].id).toBe(99);
        expect(salida.at(-1)!.id).toBe(19);
    });

    it('admite un tope distinto', () => {
        expect(agregarAHistorial([item(1), item(2)], item(3), 2).map((h) => h.id)).toEqual([3, 1]);
    });

    it('no muta el historial recibido', () => {
        const previo = [item(1)];
        agregarAHistorial(previo, item(2));
        expect(previo.map((h) => h.id)).toEqual([1]);
    });
});
