export type ContractType = 'INDEFINIDO' | 'PLAZO_FIJO' | 'TEMPORAL' | 'PRACTICAS' | 'LOCACION_SERVICIOS';
export type ContractStatus = 'ACTIVO' | 'FINALIZADO' | 'SUSPENDIDO' | 'RENOVADO';
export type WorkingDay = 'COMPLETA' | 'PARCIAL' | 'REDUCIDA';

export interface Contract {
    id: number;
    tenantId: number;
    employeeId: number;
    employeeName: string;
    tipoContrato: ContractType;
    fechaInicio: string;
    fechaFin?: string;
    salarioBase: number;
    moneda: string;
    jornadaLaboral: WorkingDay;
    horasSemanales: number;
    periodoPruebaMeses?: number;
    documentoContratoUrl?: string;
    estado: ContractStatus;
    motivoFin?: string;
    expiringSoon: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface ContractRequest {
    employeeId: number;
    tipoContrato: ContractType;
    fechaInicio: string;
    fechaFin?: string;
    salarioBase: number;
    moneda?: string;
    jornadaLaboral: WorkingDay;
    horasSemanales: number;
    periodoPruebaMeses?: number;
    documentoContratoUrl?: string;
}

