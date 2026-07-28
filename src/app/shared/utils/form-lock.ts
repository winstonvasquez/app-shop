import { FormGroup } from '@angular/forms';

/**
 * Bloqueo de campos no editables en los formularios del ERP.
 *
 * Regla del sistema: un valor que la lista muestra se puede registrar y editar
 * desde el formulario, SALVO que cambiarlo tras el primer guardado deje datos
 * inconsistentes. Esos campos no se ocultan (el usuario tiene que poder leerlos):
 * se muestran bloqueados.
 *
 * Mecanismo único, para no repetir las tres formas que convivían antes
 * (`[disabled]` en el template junto a formControlName — que además hace que
 * Angular emita un warning —, `disabled: true` en el FormBuilder, y `.disable()`
 * suelto):
 *
 *   - `bloquearEnEdicion()` sobre el FormGroup, llamado al abrir el drawer.
 *   - Los `<input>` puramente informativos (totales calculados por el backend)
 *     pueden usar el atributo `readonly`, que ya tiene estilo propio en
 *     `styles/components/_form-field.scss`.
 *
 * ⚠️ Un control deshabilitado NO aparece en `form.value`. Al enviar el
 * formulario hay que usar `form.getRawValue()`, si no se pierden esos campos.
 */

/**
 * Campos que, una vez guardados, no deben cambiar en ninguna pantalla del ERP.
 *
 * - Identidad tributaria y de login: cambiarlos rompe la trazabilidad y el acceso.
 * - Códigos y correlativos: se referencian desde documentos ya emitidos.
 * - Claves de relación de un documento: reapuntar el documento descuadra stock,
 *   contabilidad o notas de crédito.
 */
export const CLAVES_NO_EDITABLES: readonly string[] = [
    // identidad
    'ruc', 'numeroDocumento', 'tipoDocumento', 'documentoIdentidad', 'dni',
    'username', 'email',
    // códigos y numeración
    'codigo', 'code', 'sku', 'codigoEmpleado', 'serie', 'numero', 'numeroDocumento',
    'correlativo', 'trackingNumber', 'movementNumber', 'transferNumber', 'countNumber',
    'asnNumber', 'serialNumber', 'loteNumero', 'serieBoleta', 'serieFactura',
    // claves de relación de un documento ya emitido
    'proveedorId', 'employeeId', 'ordenCompraId', 'recepcionId', 'pedidoId',
    'almacenId', 'warehouseId', 'companyId', 'tenantId',
    // periodo contable / presupuestal
    'periodo', 'ejercicio',
];

/**
 * Deshabilita en modo edición los campos indicados y los rehabilita en alta.
 *
 * @param form      formulario del drawer
 * @param campos    nombres de control a bloquear (normalmente un subconjunto de
 *                  CLAVES_NO_EDITABLES más los propios de la entidad)
 * @param esEdicion true al abrir un registro existente, false al crear
 */
export function bloquearEnEdicion(form: FormGroup, campos: readonly string[], esEdicion: boolean): void {
    for (const nombre of campos) {
        const control = form.get(nombre);
        if (!control) continue;
        if (esEdicion) {
            control.disable({ emitEvent: false });
        } else {
            control.enable({ emitEvent: false });
        }
    }
}

/**
 * Campos calculados por el backend: nunca editables, ni al crear ni al editar.
 * Se dejan visibles para que el usuario los consulte desde el propio formulario.
 */
export function bloquearSiempre(form: FormGroup, campos: readonly string[]): void {
    for (const nombre of campos) {
        form.get(nombre)?.disable({ emitEvent: false });
    }
}
