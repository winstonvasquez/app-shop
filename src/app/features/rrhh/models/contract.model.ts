export type ContractType = 'INDEFINIDO' | 'PLAZO_FIJO' | 'TEMPORAL' | 'PRACTICAS' | 'LOCACION_SERVICIOS';
export type ContractStatus = 'ACTIVO' | 'FINALIZADO' | 'SUSPENDIDO' | 'RENOVADO';
export type WorkingDay = 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_HORAS';

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

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    INDEFINIDO: 'Indefinido',
    PLAZO_FIJO: 'Plazo Fijo',
    TEMPORAL: 'Temporal',
    PRACTICAS: 'Prácticas',
    LOCACION_SERVICIOS: 'Locación de Servicios',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
    ACTIVO: 'Activo',
    FINALIZADO: 'Finalizado',
    SUSPENDIDO: 'Suspendido',
    RENOVADO: 'Renovado',
};

export const WORKING_DAY_LABELS: Record<WorkingDay, string> = {
    TIEMPO_COMPLETO: 'Tiempo Completo',
    MEDIO_TIEMPO: 'Medio Tiempo',
    POR_HORAS: 'Por Horas',
};
