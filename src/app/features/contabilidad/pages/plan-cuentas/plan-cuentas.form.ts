import { CuentaContableRequest, CuentaContableUpdateRequest } from '../../services/cuenta.service';

/**
 * Valores crudos de `cuentaForm.getRawValue()`. Se lee con `getRawValue` y no con
 * `.value` porque en edición el código está deshabilitado y no saldría en `.value`.
 */
export interface CuentaFormRaw {
    codigo: string;
    nombre: string;
    tipo: string;
    cuentaPadreId: string | null;
    estado: string;
    esAnalitica: boolean;
    aceptaMovimiento: boolean;
}

/**
 * Alta de una cuenta PCGE.
 *
 * `nivel` no viaja: el backend lo deriva de la longitud del código
 * (CuentaContableCommandService.derivarNivel), y mandarlo abriría la puerta a que la
 * jerarquía del plan contable dependiera de lo que envíe el navegador.
 *
 * `cuentaPadreId` usa `||` y no `??`: el select vacío entrega `''`, y una cadena vacía
 * no es un padre sino su ausencia — una cuenta de nivel 1 es raíz y va con `null`.
 */
export function construirCuentaRequest(raw: CuentaFormRaw): CuentaContableRequest {
    return {
        codigo: raw.codigo,
        nombre: raw.nombre,
        tipo: raw.tipo,
        cuentaPadreId: raw.cuentaPadreId || null,
        estado: raw.estado,
        esAnalitica: raw.esAnalitica,
        aceptaMovimiento: raw.aceptaMovimiento,
    };
}

/**
 * Edición de una cuenta PCGE: el mismo cuerpo SIN el código. El código es clave de
 * negocio y ya está referenciado desde los asientos registrados, así que se bloquea en
 * el formulario y tampoco se envía.
 */
export function construirCuentaUpdateRequest(raw: CuentaFormRaw): CuentaContableUpdateRequest {
    const { codigo, ...resto } = construirCuentaRequest(raw);
    return resto;
}
