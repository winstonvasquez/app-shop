import { describe, expect, it } from 'vitest';
import { debeIgnorarTecla, mapearTeclaPos } from './pos-keyboard.keymap';
import { POS_SHORTCUTS } from './pos-keyboard.service';

describe('mapearTeclaPos', () => {
    it.each([
        ['F1', 'nuevaVenta'],
        ['F2', 'holdOrder'],
        ['F3', 'recallOrder'],
        ['F4', 'customerSearch'],
        ['F5', 'cobrar'],
        ['F10', 'toggleFullscreen'],
        ['?', 'toggleShortcuts'],
    ])('%s ejecuta la acción %s', (key, name) => {
        expect(mapearTeclaPos(key)).toEqual({ type: 'action', name });
    });

    it.each([
        ['F7', 'historial'],
        ['F8', 'devoluciones'],
        ['F9', 'turno'],
        ['Escape', 'main'],
    ])('%s navega a %s', (key, screen) => {
        expect(mapearTeclaPos(key)).toEqual({ type: 'navigate', screen });
    });

    it.each(['F6', 'F11', 'F12', 'a', 'Enter', 'Tab', '', ' '])(
        '%s no está asignada y devuelve null (el navegador se queda con ella)',
        (key) => {
            expect(mapearTeclaPos(key)).toBeNull();
        },
    );

    it('distingue mayúsculas: "f1" no es "F1"', () => {
        expect(mapearTeclaPos('f1')).toBeNull();
    });

    it('el panel de ayuda no anuncia ninguna tecla que no esté asignada', () => {
        // Si alguien añade una fila a POS_SHORTCUTS sin asignarla aquí, el atajo sería mentira.
        const sinAsignar = POS_SHORTCUTS.filter(s => mapearTeclaPos(s.key) === null);
        expect(sinAsignar).toEqual([]);
    });
});

describe('debeIgnorarTecla', () => {
    it('fuera de un campo editable no se ignora nada', () => {
        expect(debeIgnorarTecla('BODY', '?')).toBe(false);
        expect(debeIgnorarTecla('BUTTON', 'a')).toBe(false);
        expect(debeIgnorarTecla(undefined, '?')).toBe(false);
    });

    it.each(['INPUT', 'TEXTAREA', 'SELECT'])('escribiendo en %s, las teclas normales pasan de largo', (tag) => {
        expect(debeIgnorarTecla(tag, '?')).toBe(true);
        expect(debeIgnorarTecla(tag, 'a')).toBe(true);
        expect(debeIgnorarTecla(tag, 'Enter')).toBe(true);
    });

    it.each(['INPUT', 'TEXTAREA', 'SELECT'])('escribiendo en %s, F-keys y Escape siguen siendo atajos', (tag) => {
        expect(debeIgnorarTecla(tag, 'F5')).toBe(false);
        expect(debeIgnorarTecla(tag, 'F10')).toBe(false);
        expect(debeIgnorarTecla(tag, 'Escape')).toBe(false);
    });

    it('el prefijo "F" es literal: una tecla que empiece por F pasa aunque no sea de función', () => {
        // Comportamiento heredado, no un descuido nuevo: `Escape` y `F*` pasan por prefijo.
        expect(debeIgnorarTecla('INPUT', 'F')).toBe(false);
        // Y una minúscula NO empieza por 'F', así que sí se ignora.
        expect(debeIgnorarTecla('INPUT', 'f')).toBe(true);
    });
});
