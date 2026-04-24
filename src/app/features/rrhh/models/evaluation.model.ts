export type EvaluationType = 'ANUAL' | 'SEMESTRAL' | 'TRIMESTRAL' | 'PERIODO_PRUEBA' | 'PROMOCION';
export type EvaluationStatus = 'BORRADOR' | 'COMPLETADA' | 'APROBADA' | 'CANCELADA';
export type GoalStatus = 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'RETRASADO';
export type GoalPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface EvaluationDetail {
    id: number;
    criteriaId: number;
    criteriaName: string;
    pesoPorcentaje: number;
    puntaje: number;
    comentarios: string | null;
}

export interface Evaluation {
    id: number;
    tenantId: number;
    employeeId: number;
    employeeName: string | null;
    periodo: string;
    evaluadorId: number;
    evaluadorName: string | null;
    tipoEvaluacion: EvaluationType;
    tipoRelacionEvaluador: string | null;
    puntaje: number;
    comentarios: string | null;
    fortalezas: string | null;
    areasMejora: string | null;
    planMejora: string | null;
    estado: EvaluationStatus;
    fechaEvaluacion: string;
    proximaRevision: string | null;
    details: EvaluationDetail[];
    createdAt: string;
    updatedAt: string | null;
}

export interface EvaluationRequest {
    employeeId: number;
    periodo: string;
    evaluadorId: number;
    puntaje: number;
    tipoEvaluacion?: string;
    tipoRelacionEvaluador?: string;
    comentarios?: string;
    fortalezas?: string;
    areasMejora?: string;
    planMejora?: string;
    fechaEvaluacion: string;
    proximaRevision?: string;
    details?: { criteriaId: number; puntaje: number; comentarios?: string }[];
}

export interface EvaluationCriteria {
    id: number;
    tenantId: number;
    nombre: string;
    descripcion: string | null;
    pesoPorcentaje: number;
    puntajeMinimo: number;
    puntajeMaximo: number;
    activo: boolean;
    createdAt: string;
    updatedAt: string | null;
}

export interface EvaluationCriteriaRequest {
    nombre: string;
    descripcion?: string;
    pesoPorcentaje: number;
    puntajeMinimo?: number;
    puntajeMaximo?: number;
}

export interface Goal {
    id: number;
    tenantId: number;
    employeeId: number;
    employeeName: string | null;
    titulo: string;
    descripcion: string | null;
    fechaInicio: string;
    fechaFin: string;
    estado: GoalStatus;
    porcentajeAvance: number;
    prioridad: GoalPriority;
    asignadoPorId: number | null;
    asignadoPorName: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface GoalRequest {
    employeeId: number;
    titulo: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    prioridad?: string;
    asignadoPorId?: number;
    porcentajeAvance?: number;
}

export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
    ANUAL: 'Anual',
    SEMESTRAL: 'Semestral',
    TRIMESTRAL: 'Trimestral',
    PERIODO_PRUEBA: 'Periodo de Prueba',
    PROMOCION: 'Promoción',
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
    BORRADOR: 'Borrador',
    COMPLETADA: 'Completada',
    APROBADA: 'Aprobada',
    CANCELADA: 'Cancelada',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
    EN_PROGRESO: 'En Progreso',
    COMPLETADO: 'Completado',
    CANCELADO: 'Cancelado',
    RETRASADO: 'Retrasado',
};

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
    ALTA: 'Alta',
    MEDIA: 'Media',
    BAJA: 'Baja',
};
