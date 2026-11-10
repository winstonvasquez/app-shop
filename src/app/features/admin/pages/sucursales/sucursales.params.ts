/**
 * Series CPE de una sucursal. Espejan los `@Pattern` de `SucursalRequestDto` (microshopventas):
 * vacío o letra B/F + 3 letras/dígitos en MAYÚSCULA. Un valor libre rompería la numeración SUNAT.
 */
export const PATRON_SERIE_BOLETA = /^(B[A-Z0-9]{3})?$/;
export const PATRON_SERIE_FACTURA = /^(F[A-Z0-9]{3})?$/;

export const MSJ_SERIE_BOLETA = 'La serie de boleta debe ser B seguida de 3 letras/dígitos en mayúscula (ej. B003)';
export const MSJ_SERIE_FACTURA = 'La serie de factura debe ser F seguida de 3 letras/dígitos en mayúscula (ej. F003)';
