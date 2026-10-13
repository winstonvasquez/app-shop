import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { mensajeDeErrorDeControl } from './form-errors';

describe('mensajeDeErrorDeControl', () => {
    it('devuelve cadena vacía cuando el control es válido o no existe', () => {
        expect(mensajeDeErrorDeControl(new FormControl('x', Validators.required))).toBe('');
        expect(mensajeDeErrorDeControl(null)).toBe('');
    });

    // Los siete validadores de la tabla, cada uno con su parámetro: es la única forma de que un
    // cambio en una entrada no pase inadvertido, porque cada entrada es una rama distinta.
    it.each([
        [new FormControl('', Validators.required), 'Campo requerido'],
        [new FormControl('no-es-un-email', Validators.email), 'Email inválido'],
        [new FormControl('abc', Validators.pattern(/^\d+$/)), 'Formato inválido'],
        [new FormControl('ab', Validators.minLength(5)), 'Mínimo 5 caracteres'],
        [new FormControl('abcdef', Validators.maxLength(3)), 'Máximo 3 caracteres'],
        [new FormControl(2, Validators.min(10)), 'Valor mínimo: 10'],
        [new FormControl(99, Validators.max(10)), 'Valor máximo: 10'],
    ])('traduce el validador con su parámetro → %#', (control, esperado) => {
        expect(mensajeDeErrorDeControl(control)).toBe(esperado);
    });

    it('con varios errores a la vez devuelve el primero de la tabla que encaja', () => {
        const c = new FormControl('', [Validators.required, Validators.minLength(5)]);
        expect(mensajeDeErrorDeControl(c)).toBe('Campo requerido');
    });

    it('un texto propio del formulario gana al estándar', () => {
        const c = new FormControl('', Validators.required);
        expect(mensajeDeErrorDeControl(c, { required: 'Elige un almacén' })).toBe('Elige un almacén');
    });

    it('un validador desconocido no deja al usuario sin mensaje', () => {
        const c = new FormControl('x', () => ({ rucInvalido: true }));
        expect(mensajeDeErrorDeControl(c)).toBe('Campo inválido');
    });
});
