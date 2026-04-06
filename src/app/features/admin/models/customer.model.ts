// Modelos alineados con los DTOs del backend microshopventas

export interface CustomerResponse {
    id: number;
    companyId: number;
    companyName: string;
    userId: number | null;
    tipoCliente: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
    tipoDocumento: string;
    numeroDocumento: string;
    nombres: string;
    apellidos: string | null;
    razonSocial: string | null;
    nombreComercial: string | null;
    nombreCompleto: string;
    email: string | null;
    telefono: string | null;
    celular: string | null;
    segmentoId: number | null;
    limiteCredito: number;
    saldoCredito: number;
    condicionPago: string;
    notas: string | null;
    activo: boolean;
    fechaCreacion: string;
    usuarioCreacion: string;
}

export interface CustomerRequest {
    companyId: number;
    userId?: number | null;
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
    segmentoId?: number | null;
    limiteCredito?: number;
    condicionPago?: string;
    notas?: string | null;
}

export interface CustomerDireccionResponse {
    id: number;
    tipoDireccion: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    referencia: string | null;
    ubigeo: string | null;
    esPrincipal: boolean;
    fechaCreacion: string;
}

export interface CustomerDireccionRequest {
    tipoDireccion: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    referencia?: string | null;
    ubigeo?: string | null;
    esPrincipal: boolean;
}

export interface CustomerContactoResponse {
    id: number;
    nombreCompleto: string;
    cargo: string | null;
    email: string | null;
    telefono: string | null;
    esPrincipal: boolean;
    fechaCreacion: string;
}

export interface CustomerContactoRequest {
    nombreCompleto: string;
    cargo?: string | null;
    email?: string | null;
    telefono?: string | null;
    esPrincipal: boolean;
}

export const TIPO_CLIENTE_OPTIONS = [
    { value: 'PERSONA_NATURAL', label: 'Persona Natural' },
    { value: 'PERSONA_JURIDICA', label: 'Persona Jurídica' },
] as const;

export const TIPO_DOCUMENTO_OPTIONS = [
    { value: 'DNI', label: 'DNI', length: 8 },
    { value: 'RUC', label: 'RUC', length: 11 },
    { value: 'CE', label: 'Carnet de Extranjería', length: 12 },
    { value: 'PASAPORTE', label: 'Pasaporte', length: 15 },
] as const;

export const CONDICION_PAGO_OPTIONS = [
    { value: 'CONTADO', label: 'Contado' },
    { value: 'CREDITO_15', label: 'Crédito 15 días' },
    { value: 'CREDITO_30', label: 'Crédito 30 días' },
    { value: 'CREDITO_60', label: 'Crédito 60 días' },
] as const;

export const TIPO_DIRECCION_OPTIONS = [
    { value: 'FISCAL', label: 'Fiscal' },
    { value: 'ENVIO', label: 'Envío' },
    { value: 'AMBAS', label: 'Fiscal y Envío' },
] as const;
