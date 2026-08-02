import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { htmlAttr, htmlToText, RICH_TEXT_MARKUP, richTextMaxLength } from './rich-text.util';

describe('rich-text.util', () => {
    describe('htmlToText', () => {
        it('devuelve el texto visible sin etiquetas', () => {
            expect(htmlToText('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo');
        });

        it('es null-safe', () => {
            expect(htmlToText(null)).toBe('');
            expect(htmlToText(undefined)).toBe('');
        });
    });

    describe('htmlAttr', () => {
        it('escapa las comillas que romperían un atributo', () => {
            expect(htmlAttr('<p>dijo "no"</p>')).toBe('dijo &quot;no&quot;');
        });
    });

    describe('RICH_TEXT_MARKUP', () => {
        it('reconoce marcado del editor', () => {
            expect(RICH_TEXT_MARKUP.test('<p>x</p>')).toBe(true);
            expect(RICH_TEXT_MARKUP.test('a<br>b')).toBe(true);
        });

        /** Regresión: aplanar por un `<` suelto se comía el resto de la celda al exportar. */
        it('no confunde un "<" de texto plano con marcado', () => {
            expect(RICH_TEXT_MARKUP.test('stock <minimo 5')).toBe(false);
            expect(RICH_TEXT_MARKUP.test('cantidad < 5')).toBe(false);
        });
    });

    describe('richTextMaxLength', () => {
        it('mide el texto visible, no las etiquetas', () => {
            const validator = richTextMaxLength(10);
            // 5 caracteres visibles envueltos en ~30 de marcado: debe pasar.
            expect(validator(new FormControl('<p><b><u>hola!</u></b></p>'))).toBeNull();
        });

        it('rechaza cuando el texto visible excede el límite', () => {
            const validator = richTextMaxLength(5);
            expect(validator(new FormControl('<p>demasiado largo</p>'))).toEqual({
                maxlength: { requiredLength: 5, actualLength: 15 },
            });
        });
    });
});
