export type AttendanceType = 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';

export interface Attendance {
    id: number;
    tenantId: number;
    employeeId: number;
    employeeName?: string;
    fecha: string;
    horaEntrada?: string;
    horaSalida?: string;
    horasTrabajadas?: number;
    horasExtras?: number;
    tipoRegistro: AttendanceType;
    observaciones?: string;
    justificacion?: string;
    ubicacionEntrada?: string;
    ubicacionSalida?: string;
    createdAt: string;
}

export interface AttendanceRequest {
    employeeId: number;
    fecha: string;
    horaEntrada?: string;
    horaSalida?: string;
    tipoRegistro: AttendanceType;
    observaciones?: string;
    justificacion?: string;
    ubicacionEntrada?: string;
    ubicacionSalida?: string;
}

export interface CheckInOutRequest {
    employeeId: number;
    ubicacion?: string;
}

export interface AttendanceSummary {
    employeeId: number;
    employeeName: string;
    diasTrabajados: number;
    tardanzas: number;
    faltas: number;
    permisos: number;
    totalHorasTrabajadas: number;
    totalHorasExtras: number;
}
