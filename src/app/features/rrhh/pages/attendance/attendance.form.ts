import { Attendance, AttendanceCorrectionRequest, AttendanceType } from '../../models/attendance.model';

/** `getRawValue()` del drawer de corrección de asistencia. */
export interface ValoresFormularioCorreccion {
    horaEntrada: string | null;
    horaSalida: string | null;
    tipoRegistro: string | null;
    observaciones: string | null;
    justificacion: string | null;
    motivo: string | null;
}

/** El `<input type="time">` entrega `HH:mm` y el backend devuelve `HH:mm:ss`: se recorta a `HH:mm`. */
const hhmm = (hora?: string | null): string => (hora ?? '').substring(0, 5);

/** Precarga el drawer con los valores ACTUALES: el PUT reemplaza todo, no es parcial. */
export function formularioDesdeAsistencia(a: Attendance): ValoresFormularioCorreccion {
    return {
        horaEntrada: hhmm(a.horaEntrada),
        horaSalida: hhmm(a.horaSalida),
        tipoRegistro: a.tipoRegistro,
        observaciones: a.observaciones ?? '',
        justificacion: a.justificacion ?? '',
        motivo: '',
    };
}

/**
 * Cuerpo del PUT /hr/api/attendance/{id}. LocalTime no acepta "": las horas vacías se OMITEN
 * (sin entrada o salida el backend deja horas trabajadas en null). `motivo` va recortado y es
 * obligatorio (el formulario ya validó que no esté vacío).
 */
export function correccionDesdeForm(v: ValoresFormularioCorreccion): AttendanceCorrectionRequest {
    return {
        horaEntrada: v.horaEntrada || undefined,
        horaSalida: v.horaSalida || undefined,
        tipoRegistro: v.tipoRegistro as AttendanceType,
        observaciones: v.observaciones || undefined,
        justificacion: v.justificacion || undefined,
        motivo: (v.motivo ?? '').trim(),
    };
}
