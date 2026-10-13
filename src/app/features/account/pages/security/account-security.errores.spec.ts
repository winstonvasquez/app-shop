import { describe, expect, it } from 'vitest';
import { FormControl, Validators } from '@angular/forms';
import { mensajeDeErrorDeSeguridad } from './account-security.errores';

/** Control obligatorio y vacío (inválido), en el estado que se le pida. */
function control(estado: 'pristine' | 'tocado' | 'sucio' = 'pristine', valor = ''): FormControl {
    const c = new FormControl(valor, [Validators.required, Validators.minLength(8)]);
    if (estado === 'tocado') { c.markAsTouched(); c.markAsDirty(); }
    if (estado === 'sucio') c.markAsDirty();
    return c;
}

describe('mensajeDeErrorDeSeguridad', () => {
    it('un campo intacto no muestra nada aunque sea inválido', () => {
        expect(mensajeDeErrorDeSeguridad(control('pristine'), false, false)).toBe('');
    });

    it('un campo ya escrito e inválido delega el texto en la traducción compartida', () => {
        expect(mensajeDeErrorDeSeguridad(control('sucio'), false, false)).toBe('Campo requerido');
        expect(mensajeDeErrorDeSeguridad(control('sucio', 'corta'), false, false)).toBe('Mínimo 8 caracteres');
    });

    it('un campo válido no muestra nada', () => {
        expect(mensajeDeErrorDeSeguridad(control('sucio', 'contrasenaLarga'), false, false)).toBe('');
    });

    it('un nombre de campo inexistente (control null) no revienta ni muestra nada', () => {
        expect(mensajeDeErrorDeSeguridad(null, false, false)).toBe('');
        expect(mensajeDeErrorDeSeguridad(null, true, true)).toBe('');
    });

    // ── desajuste entre contraseña y confirmación ────────────────────────────────────────
    it('el desajuste sólo se anuncia en «confirmar», no en los otros campos', () => {
        expect(mensajeDeErrorDeSeguridad(control('tocado', 'otraCosaLarga'), true, true))
            .toBe('Las contraseñas no coinciden.');
        expect(mensajeDeErrorDeSeguridad(control('tocado', 'otraCosaLarga'), false, true)).toBe('');
    });

    it('el desajuste no se anuncia hasta que «confirmar» se ha tocado', () => {
        expect(mensajeDeErrorDeSeguridad(control('sucio', 'otraCosaLarga'), true, true)).toBe('');
    });

    it('el desajuste manda sobre el error propio del control', () => {
        expect(mensajeDeErrorDeSeguridad(control('tocado', 'corta'), true, true))
            .toBe('Las contraseñas no coinciden.');
    });

    it('sin desajuste, «confirmar» se comporta como cualquier otro campo', () => {
        expect(mensajeDeErrorDeSeguridad(control('tocado', 'corta'), true, false)).toBe('Mínimo 8 caracteres');
        expect(mensajeDeErrorDeSeguridad(control('pristine'), true, false)).toBe('');
    });
});
