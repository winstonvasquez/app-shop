import { describe, expect, it } from 'vitest';
import { claseDeBotonDeAccion, tipoDeIcono } from './action-icon.util';

describe('tipoDeIcono', () => {
    it.each([
        ['✏️', 'edit'], ['✏', 'edit'], ['edit', 'edit'],
        ['🗑️', 'delete'], ['trash', 'delete'], ['delete', 'delete'],
        ['👁️', 'view'], ['view', 'view'],
        ['✓', 'check'], ['✔️', 'check'], ['approve', 'check'],
        ['✗', 'x'], ['🚫', 'x'], ['reject', 'x'],
        ['📍', 'pin'], ['location', 'pin'],
    ])('reconoce %s como %s', (icono, esperado) => {
        expect(tipoDeIcono(icono)).toBe(esperado);
    });

    it('tolera espacios alrededor', () => {
        expect(tipoDeIcono('  edit  ')).toBe('edit');
    });

    it('lo que no reconoce se pinta como texto', () => {
        expect(tipoDeIcono('🎉')).toBe('text');
        expect(tipoDeIcono('')).toBe('text');
    });
});

describe('claseDeBotonDeAccion', () => {
    it('la clase explícita de la acción manda sobre el icono', () => {
        // Icono de borrar pero clase de editar: gana la clase, como antes.
        expect(claseDeBotonDeAccion('btn-icon-edit algo-mas', '🗑️')).toBe('btn-icon btn-icon-edit');
        expect(claseDeBotonDeAccion('btn-delete', '✏️')).toBe('btn-icon btn-icon-delete');
        expect(claseDeBotonDeAccion('btn-view', undefined)).toBe('btn-icon btn-view');
    });

    it('sin clase explícita, la deduce del icono', () => {
        expect(claseDeBotonDeAccion(undefined, '✏️')).toBe('btn-icon btn-icon-edit');
        expect(claseDeBotonDeAccion('', '🗑️')).toBe('btn-icon btn-icon-delete');
        expect(claseDeBotonDeAccion('', '👁️')).toBe('btn-icon btn-view');
    });

    it('check reusa el estilo de editar y x el de borrar', () => {
        expect(claseDeBotonDeAccion('', '✓')).toBe('btn-icon btn-icon-edit');
        expect(claseDeBotonDeAccion('', '✗')).toBe('btn-icon btn-icon-delete');
    });

    it('sin icono reconocible conserva la clase que traía la acción', () => {
        expect(claseDeBotonDeAccion('btn-warning', '🎉')).toBe('btn-icon btn-warning');
        expect(claseDeBotonDeAccion(undefined, undefined)).toBe('btn-icon');
    });
});
