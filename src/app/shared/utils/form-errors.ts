import { AbstractControl } from '@angular/forms';

/**
 * Traducción única de los errores de validación de un control a texto para el usuario.
 *
 * Esta cadena de `if (c.hasError('required')) …` estaba escrita **trece veces**, una por
 * formulario, y ya había divergido: nueve decían «Campo requerido» y tres «Este campo es
 * obligatorio» para exactamente el mismo error.
 *
 * Lo que NO se centraliza aquí, a propósito, es **cuándo mostrar** el mensaje: unos formularios
 * usan `pristine` y otros `touched`, y eso es una decisión de cada pantalla, no un detalle
 * duplicado. Cada componente conserva su guarda y delega sólo el texto.
 */
export function mensajeDeErrorDeControl(
    control: AbstractControl | null | undefined,
    personalizados: Readonly<Record<string, string>> = {},
): string {
    if (!control?.errors) return '';

    for (const [clave, detalle] of Object.entries(control.errors)) {
        const propio = personalizados[clave];
        if (propio) return propio;
        const estandar = TEXTOS[clave]?.(detalle);
        if (estandar) return estandar;
    }
    return 'Campo inválido';
}

/** El `detalle` es el valor que Angular guarda en `errors[clave]` para ese validador. */
const TEXTOS: Readonly<Record<string, (detalle: unknown) => string>> = {
    required: () => 'Campo requerido',
    email: () => 'Email inválido',
    pattern: () => 'Formato inválido',
    minlength: (d) => `Mínimo ${(d as { requiredLength: number }).requiredLength} caracteres`,
    maxlength: (d) => `Máximo ${(d as { requiredLength: number }).requiredLength} caracteres`,
    min: (d) => `Valor mínimo: ${(d as { min: number }).min}`,
    max: (d) => `Valor máximo: ${(d as { max: number }).max}`,
};
