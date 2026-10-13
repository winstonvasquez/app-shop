import { CompanyRequest } from '@features/admin/models/company.model';

/**
 * Valores crudos del formulario de empresa (`companyForm.getRawValue()`).
 * Se usa `getRawValue()` porque `ruc` y `domain` quedan deshabilitados en edición y con
 * `.value` viajarían nulos, borrándolos del tenant.
 */
export interface CompanyFormRaw {
    name: string;
    ruc: string;
    active: boolean;
    legalName?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    domain?: string | null;
}

/**
 * Traduce el formulario de empresa al DTO de microshopusers.
 *
 * Regla de negocio: **los campos opcionales vacíos se OMITEN (`undefined`), no se mandan
 * vacíos ni nulos**. `domain` es el que resuelve el tenant del visitante anónimo y `ruc` firma
 * los comprobantes: mandar `''` los sobrescribiría con basura. Nombre, RUC y estado son
 * obligatorios y viajan siempre, incluido `active: false` (baja lógica de la empresa).
 */
export function construirCompanyRequest(v: CompanyFormRaw): CompanyRequest {
    return {
        name: v.name,
        ruc: v.ruc,
        active: v.active,
        legalName: v.legalName || undefined,
        address: v.address || undefined,
        phone: v.phone || undefined,
        email: v.email || undefined,
        logoUrl: v.logoUrl || undefined,
        domain: v.domain || undefined,
    };
}
