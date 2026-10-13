import { describe, expect, it } from 'vitest';
import { accionDeTecla, EstadoDelSelect } from './server-search-keys.util';

/** Desplegable abierto con 3 opciones y ninguna resaltada. */
const ABIERTO: EstadoDelSelect = { abierto: true, indiceActivo: -1, totalOpciones: 3 };
const CERRADO: EstadoDelSelect = { ...ABIERTO, abierto: false };

describe('accionDeTecla', () => {
    it('ArrowDown con el desplegable cerrado lo abre sin mover el resaltado', () => {
        expect(accionDeTecla('ArrowDown', CERRADO)).toEqual({ accion: 'abrir', prevenir: true });
    });

    it('ArrowDown abierto avanza el resaltado, empezando por la primera opción', () => {
        expect(accionDeTecla('ArrowDown', ABIERTO))
            .toEqual({ accion: 'mover', indice: 0, prevenir: true });
        expect(accionDeTecla('ArrowDown', { ...ABIERTO, indiceActivo: 0 }))
            .toEqual({ accion: 'mover', indice: 1, prevenir: true });
    });

    it('ArrowDown en la última opción se queda ahí: no da la vuelta', () => {
        expect(accionDeTecla('ArrowDown', { ...ABIERTO, indiceActivo: 2 }))
            .toEqual({ accion: 'mover', indice: 2, prevenir: true });
    });

    it('ArrowDown sin opciones cargadas deja el índice en -1, no en 0', () => {
        expect(accionDeTecla('ArrowDown', { abierto: true, indiceActivo: -1, totalOpciones: 0 }))
            .toEqual({ accion: 'mover', indice: -1, prevenir: true });
    });

    it('ArrowUp retrocede y se topa en la primera opción', () => {
        expect(accionDeTecla('ArrowUp', { ...ABIERTO, indiceActivo: 2 }))
            .toEqual({ accion: 'mover', indice: 1, prevenir: true });
        expect(accionDeTecla('ArrowUp', { ...ABIERTO, indiceActivo: 0 }))
            .toEqual({ accion: 'mover', indice: 0, prevenir: true });
    });

    it('ArrowUp sin nada resaltado (-1) sube a 0, no a -2', () => {
        expect(accionDeTecla('ArrowUp', ABIERTO))
            .toEqual({ accion: 'mover', indice: 0, prevenir: true });
    });

    it('ArrowUp actúa aunque el desplegable esté cerrado (mismo comportamiento que antes)', () => {
        expect(accionDeTecla('ArrowUp', { ...CERRADO, indiceActivo: 2 }))
            .toEqual({ accion: 'mover', indice: 1, prevenir: true });
    });

    it('Enter con una opción resaltada la selecciona', () => {
        expect(accionDeTecla('Enter', { ...ABIERTO, indiceActivo: 1 }))
            .toEqual({ accion: 'seleccionar', indice: 1, prevenir: true });
    });

    it('Enter sin nada resaltado no hace nada Y NO intercepta la tecla (el form debe poder enviarse)', () => {
        expect(accionDeTecla('Enter', ABIERTO)).toBeNull();
    });

    it('Enter con el desplegable cerrado no selecciona aunque haya un índice resaltado', () => {
        expect(accionDeTecla('Enter', { ...CERRADO, indiceActivo: 1 })).toBeNull();
    });

    it('Enter con un índice fuera del rango de opciones no selecciona nada', () => {
        expect(accionDeTecla('Enter', { ...ABIERTO, indiceActivo: 3 })).toBeNull();
        expect(accionDeTecla('Enter', { abierto: true, indiceActivo: 0, totalOpciones: 0 })).toBeNull();
    });

    it('Escape cierra y NO intercepta la tecla', () => {
        expect(accionDeTecla('Escape', ABIERTO)).toEqual({ accion: 'cerrar', prevenir: false });
    });

    it('cualquier otra tecla no es nuestra: sigue su curso', () => {
        for (const k of ['a', 'Tab', 'Home', 'PageDown', ' ']) {
            expect(accionDeTecla(k, ABIERTO), k).toBeNull();
        }
    });
});
