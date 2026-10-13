import { describe, expect, it } from 'vitest';
import { indiceDeTeclaGaleria } from './galeria-teclado.util';

describe('indiceDeTeclaGaleria', () => {
    it('avanza con la flecha derecha y con la de abajo', () => {
        expect(indiceDeTeclaGaleria('ArrowRight', 1, 4)).toBe(2);
        expect(indiceDeTeclaGaleria('ArrowDown', 1, 4)).toBe(2);
    });

    it('retrocede con la flecha izquierda y con la de arriba', () => {
        expect(indiceDeTeclaGaleria('ArrowLeft', 2, 4)).toBe(1);
        expect(indiceDeTeclaGaleria('ArrowUp', 2, 4)).toBe(1);
    });

    it('la navegación es circular en los dos sentidos', () => {
        expect(indiceDeTeclaGaleria('ArrowRight', 3, 4)).toBe(0);
        expect(indiceDeTeclaGaleria('ArrowLeft', 0, 4)).toBe(3);
    });

    it('Inicio y Fin saltan a los extremos', () => {
        expect(indiceDeTeclaGaleria('Home', 2, 4)).toBe(0);
        expect(indiceDeTeclaGaleria('End', 2, 4)).toBe(3);
    });

    it('con una sola imagen cualquier navegación se queda en ella', () => {
        expect(indiceDeTeclaGaleria('ArrowRight', 0, 1)).toBe(0);
        expect(indiceDeTeclaGaleria('ArrowLeft', 0, 1)).toBe(0);
        expect(indiceDeTeclaGaleria('End', 0, 1)).toBe(0);
    });

    it('una tecla ajena devuelve null para que el navegador la conserve', () => {
        expect(indiceDeTeclaGaleria('Tab', 1, 4)).toBeNull();
        expect(indiceDeTeclaGaleria('Escape', 1, 4)).toBeNull();
        expect(indiceDeTeclaGaleria('a', 1, 4)).toBeNull();
        expect(indiceDeTeclaGaleria('', 1, 4)).toBeNull();
    });

    it('una tecla con nombre del prototipo tampoco se confunde con un paso', () => {
        expect(indiceDeTeclaGaleria('constructor', 1, 4)).toBeNull();
        expect(indiceDeTeclaGaleria('toString', 1, 4)).toBeNull();
    });

    it('sin medios las teclas de navegación siguen siendo suyas, con índice descartable', () => {
        expect(indiceDeTeclaGaleria('ArrowRight', 0, 0)).toBe(0);
        expect(indiceDeTeclaGaleria('ArrowLeft', 0, 0)).toBe(0);
        expect(indiceDeTeclaGaleria('Home', 0, 0)).toBe(0);
        expect(indiceDeTeclaGaleria('End', 0, 0)).toBe(0);
        expect(indiceDeTeclaGaleria('Tab', 0, 0)).toBeNull();
    });

    it('las mayúsculas y minúsculas de la tecla no se normalizan: son las del evento', () => {
        expect(indiceDeTeclaGaleria('arrowright', 1, 4)).toBeNull();
    });
});
