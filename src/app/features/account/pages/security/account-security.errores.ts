import { AbstractControl } from '@angular/forms';
import { mensajeDeErrorDeControl } from '@shared/utils/form-errors';

/**
 * Mensaje de error visible bajo un campo del formulario de cambio de contraseña.
 *
 * La política de visibilidad de ESTA pantalla —que NO es la de todas: hay tres pantallas que
 * usan `touched` en vez de `pristine`, y por eso esta guarda no se centraliza en `@shared`—:
 *
 * - **Nada se dice hasta que el usuario escribe.** Un campo `pristine` no muestra error aunque
 *   sea obligatorio y esté vacío: los tres campos nacen inválidos y llenar la pantalla de rojo
 *   al abrirla es ruido, no ayuda.
 * - **El desajuste entre contraseña y confirmación se cuelga de «confirmar»** y no del grupo,
 *   porque es donde el usuario puede corregirlo; y se muestra con `touched` (no con `pristine`)
 *   porque `markAllAsTouched()` del submit tiene que poder sacarlo a la luz.
 * - **El desajuste manda sobre el error propio del control**: decirle «campo requerido» a quien
 *   ya escribió algo que no coincide es engañoso.
 *
 * @param control       control del campo, o `null` si el nombre no existe en el formulario
 * @param esConfirmacion true sólo para el campo «confirmar contraseña»
 * @param hayDesajuste  true si el grupo tiene el error `mismatch`
 */
export function mensajeDeErrorDeSeguridad(
    control: AbstractControl | null,
    esConfirmacion: boolean,
    hayDesajuste: boolean,
): string {
    if (esConfirmacion && control?.touched && hayDesajuste) {
        return 'Las contraseñas no coinciden.';
    }
    return !control || control.pristine || control.valid ? '' : mensajeDeErrorDeControl(control);
}
