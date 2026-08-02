import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Utilidades para los campos editados con `<app-rich-text-editor>`, cuyo valor
 * es HTML y no texto plano.
 */

/**
 * Texto visible de un fragmento HTML. Úsalo antes de meter el valor en un
 * atributo (`title=`), en un `alert`/`confirm`, o al medir longitudes: el HTML
 * dentro de un atributo entrecomillado lo rompe en cuanto aparece un `"`.
 */
export function htmlToText(html: string | null | undefined): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * ¿La cadena trae marcado del editor? Se exige una etiqueta reconocible: un `<`
 * suelto ("stock <minimo") es texto legítimo, y aplanarlo lo destruiría porque el
 * parser lo tomaría por una etiqueta abierta y se comería el resto.
 */
export const RICH_TEXT_MARKUP = /<\/?(?:b|strong|i|em|u|s|strike|br|p|div|ul|ol|li|a)\b[^>]*>/i;

/**
 * Texto visible seguro para incrustar en un ATRIBUTO HTML (`title="…"`). `htmlToText`
 * no basta: una comilla doble en el contenido cierra el atributo y corrompe la etiqueta.
 */
export function htmlAttr(html: string | null | undefined): string {
    return htmlToText(html).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * `Validators.maxLength` mide la cadena HTML, así que las etiquetas consumen el
 * presupuesto de la columna y el usuario ve un rechazo sin explicación (o peor,
 * pasa el validador y revienta el `VARCHAR(n)` con un 500). Este mide el texto
 * visible; el límite debe seguir siendo holgado respecto a la columna real,
 * porque lo que se persiste es el HTML.
 */
export function richTextMaxLength(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const length = htmlToText(control.value as string | null).length;
        return length <= max ? null : { maxlength: { requiredLength: max, actualLength: length } };
    };
}
