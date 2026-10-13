import { GoalRequest } from '../../models/evaluation.model';

/** `getRawValue()` del formulario de meta (incluye `employeeId`, bloqueado en edición). */
export interface ValoresFormularioMeta {
    employeeId: number | null;
    titulo: string | null;
    descripcion: string | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    prioridad: string | null;
    porcentajeAvance: number | null;
}

/**
 * Arma el cuerpo del alta/edición de una meta de desempeño.
 *
 * `descripcion` es opcional y el control la tiene en `''` mientras esté vacía: el backend
 * espera su AUSENCIA, no una cadena vacía. `prioridad` cae a MEDIA, que es el default del
 * formulario y la que asume el tablero cuando la meta no la declara.
 *
 * `porcentajeAvance` usa `??` y NO `||` a propósito: 0% es el avance legítimo de una meta
 * recién creada, y con `||` se convertiría en el default —que aquí da igual porque también
 * es 0, pero dejaría de serlo si alguien cambia el default—.
 */
export function metaRequestDesdeForm(valores: ValoresFormularioMeta): GoalRequest {
    return {
        employeeId: valores.employeeId!,
        titulo: valores.titulo!,
        descripcion: valores.descripcion || undefined,
        fechaInicio: valores.fechaInicio!,
        fechaFin: valores.fechaFin!,
        prioridad: valores.prioridad || 'MEDIA',
        porcentajeAvance: valores.porcentajeAvance ?? 0,
    };
}
