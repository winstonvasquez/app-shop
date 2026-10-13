import { CustomerRequest } from '@features/admin/models/customer.model';

/**
 * Valores crudos del formulario de cliente, tal como salen de `form.getRawValue()`.
 * Se usa `getRawValue()` y no `value` porque tipoDocumento/numeroDocumento quedan
 * deshabilitados en edición y con `.value` viajarían como `undefined`.
 */
export interface CustomerFormRaw {
    tipoCliente: string;
    tipoDocumento: string;
    numeroDocumento: string;
    nombres: string;
    apellidos?: string | null;
    razonSocial?: string | null;
    nombreComercial?: string | null;
    email?: string | null;
    telefono?: string | null;
    celular?: string | null;
    condicionPago?: string | null;
    limiteCredito?: number | null;
    notas?: string | null;
    activo?: boolean | null;
}

/**
 * Traduce el formulario de cliente al DTO que espera microshopventas.
 *
 * Reglas de negocio que codifica:
 * - **El texto vacío es «sin dato», no cadena vacía**: los opcionales viajan `null` para que
 *   el backend borre el valor anterior en vez de guardar `''`.
 * - **`saldoCredito` NO se envía nunca**: es la deuda vigente y la calcula el backend; el
 *   formulario sólo la muestra. Enviarla la sobrescribiría con lo que el usuario tuviera en
 *   pantalla.
 * - **`condicionPago` y `limiteCredito` tienen valor por defecto de negocio** (contado y sin
 *   línea de crédito) porque el backend los exige con contenido.
 * - **`activo` se manda SIEMPRE explícito**: el backend sólo conserva el estado actual si el
 *   campo llega ausente o nulo, así que un cliente reactivado desde el drawer necesita el
 *   `true`/`false` real. Sólo un `false` literal desactiva.
 */
export function construirCustomerRequest(v: CustomerFormRaw, companyId: number): CustomerRequest {
    return {
        companyId,
        tipoCliente: v.tipoCliente,
        tipoDocumento: v.tipoDocumento,
        numeroDocumento: v.numeroDocumento,
        nombres: v.nombres,
        apellidos: v.apellidos || null,
        razonSocial: v.razonSocial || null,
        nombreComercial: v.nombreComercial || null,
        email: v.email || null,
        telefono: v.telefono || null,
        celular: v.celular || null,
        condicionPago: v.condicionPago || 'CONTADO',
        limiteCredito: v.limiteCredito || 0,
        notas: v.notas || null,
        activo: v.activo !== false,
    };
}
