import { CustomerRequest } from '@features/admin/models/customer.model';

/**
 * Arma el alta rápida de cliente desde el POS, o `null` si falta el nombre.
 *
 * El nombre es obligatorio: sin consulta RENIEC/SUNAT, un nombre fijo («Cliente») acababa
 * impreso como razón social en las facturas (POSO-13). Un documento de 11 dígitos es RUC y
 * su nombre viaja también como `razonSocial`.
 */
export function construirClienteRapido(companyId: number, documento: string, nombre: string): CustomerRequest | null {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return null;
    const esRuc = documento.length === 11;
    return {
        companyId,
        tipoCliente: esRuc ? 'PERSONA_JURIDICA' : 'PERSONA_NATURAL',
        tipoDocumento: esRuc ? 'RUC' : 'DNI',
        numeroDocumento: documento,
        nombres: nombreLimpio,
        razonSocial: esRuc ? nombreLimpio : undefined,
    };
}
