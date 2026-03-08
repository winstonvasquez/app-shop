export interface Attendance {
    id: number;
    tenantId: number;
    employeeId: number;
    fecha: string;
    horaEntrada?: string;
    horaSalida?: string;
    tipoRegistro: 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';
    observaciones?: string;
    createdAt: string;
}

export interface AttendanceRequest {
    employeeId: number;
    fecha: string;
    horaEntrada?: string;
    horaSalida?: string;
    tipoRegistro: 'NORMAL' | 'TARDANZA' | 'FALTA' | 'PERMISO' | 'LICENCIA' | 'VACACIONES';
    observaciones?: string;
}
