export type EmployeeStatus = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'CESADO';
export type Gender = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type MaritalStatus = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO' | 'CONVIVIENTE';

export interface Employee {
    id: number;
    tenantId: number;
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    tipoDocumento?: string;
    documentoIdentidad: string;
    fechaNacimiento?: string;
    genero?: Gender;
    estadoCivil?: MaritalStatus;
    nacionalidad?: string;
    tipoSangre?: string;
    fechaIngreso: string;
    fechaSalida?: string;
    motivoSalida?: string;
    departmentId?: number;
    departmentName?: string;
    positionId?: number;
    positionName?: string;
    supervisorId?: number;
    supervisorName?: string;
    cargo?: string;
    area?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    distrito?: string;
    provincia?: string;
    departamentoGeo?: string;
    fotoUrl?: string;
    linkedinUrl?: string;
    nivelEducacion?: string;
    profesion?: string;
    universidad?: string;
    sistemaPrevisional?: string;
    afpNombre?: string;
    storeId?: number;
    estado: EmployeeStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface EmployeeRequest {
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    tipoDocumento?: string;
    documentoIdentidad: string;
    fechaNacimiento?: string;
    genero?: Gender;
    estadoCivil?: MaritalStatus;
    nacionalidad?: string;
    tipoSangre?: string;
    fechaIngreso: string;
    fechaSalida?: string;
    motivoSalida?: string;
    departmentId?: number;
    positionId?: number;
    supervisorId?: number;
    cargo?: string;
    area?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    distrito?: string;
    provincia?: string;
    departamentoGeo?: string;
    fotoUrl?: string;
    linkedinUrl?: string;
    nivelEducacion?: string;
    profesion?: string;
    universidad?: string;
    sistemaPrevisional?: string;
    afpNombre?: string;
    storeId?: number;
    estado?: EmployeeStatus;
}

// ── Sub-resources ─────────────────────────────────────────────────────────

export type EmergencyContactRelationship = 'PADRE' | 'MADRE' | 'CONYUGE' | 'HIJO' | 'HIJA' | 'HERMANO' | 'HERMANA' | 'OTRO';

export interface EmergencyContact {
    id: number;
    employeeId: number;
    nombreCompleto: string;
    relacion: EmergencyContactRelationship;
    telefono: string;
    telefonoAlternativo?: string;
    direccion?: string;
    esPrincipal: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface EmergencyContactRequest {
    nombreCompleto: string;
    relacion: EmergencyContactRelationship;
    telefono: string;
    telefonoAlternativo?: string;
    direccion?: string;
    esPrincipal?: boolean;
}

export type DependentRelationship = 'CONYUGE' | 'HIJO' | 'HIJA' | 'PADRE' | 'MADRE' | 'HERMANO' | 'HERMANA';

export interface EmployeeDependent {
    id: number;
    employeeId: number;
    nombreCompleto: string;
    relacion: DependentRelationship;
    fechaNacimiento: string;
    documentoIdentidad?: string;
    genero?: Gender;
    esBeneficiarioSeguro: boolean;
    esCargaFamiliar: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface DependentRequest {
    nombreCompleto: string;
    relacion: DependentRelationship;
    fechaNacimiento: string;
    documentoIdentidad?: string;
    genero?: Gender;
    esBeneficiarioSeguro?: boolean;
    esCargaFamiliar?: boolean;
}

export type DocumentType = 'CV' | 'CONTRATO' | 'CERTIFICADO_TRABAJO' | 'CERTIFICADO_ESTUDIOS' |
    'ANTECEDENTES_PENALES' | 'ANTECEDENTES_POLICIALES' | 'CERTIFICADO_SALUD' | 'LICENCIA_CONDUCIR' |
    'CARTA_RECOMENDACION' | 'TITULO_PROFESIONAL' | 'GRADO_ACADEMICO' | 'CERTIFICACION_TECNICA' | 'OTRO';
export type DocumentStatus = 'VIGENTE' | 'VENCIDO' | 'RENOVADO' | 'ANULADO';

export interface EmployeeDocument {
    id: number;
    employeeId: number;
    tipoDocumento: DocumentType;
    nombreArchivo: string;
    descripcion?: string;
    urlArchivo: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
    estado: DocumentStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface DocumentRequest {
    tipoDocumento: DocumentType;
    nombreArchivo: string;
    descripcion?: string;
    urlArchivo: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
}

export type SalaryChangeReason = 'INCREMENTO' | 'PROMOCION' | 'AJUSTE_MERCADO' | 'CAMBIO_PUESTO' | 'NEGOCIACION' | 'AJUSTE_INFLACION';

export interface SalaryRecord {
    id: number;
    employeeId: number;
    fechaInicio: string;
    fechaFin?: string;
    salarioBase: number;
    moneda: string;
    motivo?: SalaryChangeReason;
    porcentajeIncremento?: number;
    aprobadoPorId?: number;
    aprobadoPorName?: string;
    createdAt: string;
}

export interface SalaryRequest {
    fechaInicio: string;
    fechaFin?: string;
    salarioBase: number;
    moneda?: string;
    motivo?: SalaryChangeReason;
    porcentajeIncremento?: number;
}
