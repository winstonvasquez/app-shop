export interface Proveedor {
    id?: string;
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    condicionSunat?: string;
    estadoSunat?: string;
    domicilioFiscal?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
    contactoEmail?: string;
    banco?: string;
    cuentaBanco?: string;
    condicionPago?: string;
    monedaPreferida?: string;
    /** EXCELENTE | BUENO | REGULAR | DEFICIENTE (catálogo NIVEL_PROVEEDOR). */
    nivelProveedor?: string;
    /** COM-303: marca SUNAT de agente de retención. */
    agenteRetencion?: boolean;
    estado?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProveedorPage {
    content: Proveedor[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
