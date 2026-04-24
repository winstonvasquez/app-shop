export type TrainingStatus = 'PLANIFICADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
export type ParticipationStatus = 'INSCRITO' | 'EN_CURSO' | 'COMPLETADO' | 'ABANDONADO' | 'REPROBADO';

export interface Training {
    id: number;
    tenantId: number;
    nombre: string;
    descripcion: string | null;
    fechaInicio: string;
    fechaFin: string;
    instructor: string | null;
    duracionHoras: number | null;
    estado: TrainingStatus;
    participantes: number;
    createdAt: string;
    updatedAt: string | null;
}

export interface TrainingRequest {
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    instructor?: string;
    duracionHoras?: number;
}

export interface TrainingParticipation {
    id: number;
    tenantId: number;
    trainingId: number;
    trainingName: string | null;
    employeeId: number;
    employeeName: string | null;
    fechaInscripcion: string;
    estado: ParticipationStatus;
    asistenciaPorcentaje: number | null;
    notaFinal: number | null;
    aprobado: boolean | null;
    certificadoEmitido: boolean;
    comentarios: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface TrainingParticipationRequest {
    trainingId: number;
    employeeId: number;
    asistenciaPorcentaje?: number;
    notaFinal?: number;
    comentarios?: string;
}

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
    PLANIFICADO: 'Planificado',
    EN_CURSO: 'En Curso',
    COMPLETADO: 'Completado',
    CANCELADO: 'Cancelado',
};
