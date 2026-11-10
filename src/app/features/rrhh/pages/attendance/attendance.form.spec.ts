import { describe, expect, it } from 'vitest';
import { Attendance } from '../../models/attendance.model';
import { correccionDesdeForm, formularioDesdeAsistencia } from './attendance.form';

const asistencia = {
    id: 1, tenantId: 1, employeeId: 5, fecha: '2026-03-02', horaEntrada: '08:05:00', horaSalida: undefined,
    tipoRegistro: 'TARDANZA', observaciones: 'Tráfico', createdAt: '2026-03-02T08:05:00',
} as Attendance;

describe('formularioDesdeAsistencia', () => {
    it('recorta HH:mm:ss a HH:mm, deja vacío lo ausente y limpia el motivo', () => {
        expect(formularioDesdeAsistencia(asistencia)).toEqual({
            horaEntrada: '08:05', horaSalida: '', tipoRegistro: 'TARDANZA',
            observaciones: 'Tráfico', justificacion: '', motivo: '',
        });
    });
});

describe('correccionDesdeForm', () => {
    it('omite horas vacías y recorta el motivo', () => {
        const r = correccionDesdeForm({
            horaEntrada: '08:00', horaSalida: '', tipoRegistro: 'NORMAL',
            observaciones: '', justificacion: '', motivo: '  Olvidó marcar salida ',
        });
        expect(r).toEqual({
            horaEntrada: '08:00', horaSalida: undefined, tipoRegistro: 'NORMAL',
            observaciones: undefined, justificacion: undefined, motivo: 'Olvidó marcar salida',
        });
    });
});
