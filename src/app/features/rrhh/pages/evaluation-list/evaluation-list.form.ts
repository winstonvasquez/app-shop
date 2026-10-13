import { EvaluationRequest } from '../../models/evaluation.model';

/** `getRawValue()` del formulario de evaluación, sin el FormArray de detalles. */
export interface ValoresFormularioEvaluacion {
    employeeId: number | null;
    evaluadorId: number | null;
    periodo: string | null;
    tipoEvaluacion: string | null;
    puntaje: number | null;
    fechaEvaluacion: string | null;
    comentarios: string | null;
    fortalezas: string | null;
    areasMejora: string | null;
    planMejora: string | null;
}

/** Una fila del FormArray de detalles, tal como sale de `detailsArray.value`. */
export interface ValoresDetalleEvaluacion {
    criteriaId: number | null;
    puntaje: number;
    comentarios: string;
}

/**
 * Filtra y normaliza los detalles por criterio de una evaluación.
 *
 * Regla: una fila sin criterio elegido es una fila que el usuario añadió y dejó a medias —
 * no representa ninguna nota y se descarta antes de enviar, porque el backend la rechazaría
 * por FK nula. El comentario vacío sí es válido (calificar sin justificar) y viaja ausente.
 */
export function detallesDeEvaluacion(
    filas: ValoresDetalleEvaluacion[],
): { criteriaId: number; puntaje: number; comentarios?: string }[] {
    return filas
        .filter(d => d.criteriaId != null)
        .map(d => ({
            criteriaId: d.criteriaId!,
            puntaje: d.puntaje,
            comentarios: d.comentarios || undefined,
        }));
}

/**
 * Arma el cuerpo del alta/edición de una evaluación de desempeño.
 *
 * Los cuatro textos largos son opcionales y el control los tiene en `''` mientras estén
 * vacíos: el backend espera su AUSENCIA, no una cadena vacía que quedaría guardada como
 * "comentario en blanco". `tipoEvaluacion` cae a ANUAL, que es el ciclo por defecto.
 *
 * Los detalles sólo viajan si queda alguno tras descartar las filas sin criterio: un array
 * vacío haría que el backend borrase las notas por criterio ya guardadas de la evaluación.
 */
export function evaluacionRequestDesdeForm(
    valores: ValoresFormularioEvaluacion,
    filasDetalle: ValoresDetalleEvaluacion[],
): EvaluationRequest {
    const details = detallesDeEvaluacion(filasDetalle);
    return {
        employeeId: valores.employeeId!,
        evaluadorId: valores.evaluadorId!,
        periodo: valores.periodo!,
        tipoEvaluacion: valores.tipoEvaluacion || 'ANUAL',
        puntaje: valores.puntaje!,
        fechaEvaluacion: valores.fechaEvaluacion!,
        comentarios: valores.comentarios || undefined,
        fortalezas: valores.fortalezas || undefined,
        areasMejora: valores.areasMejora || undefined,
        planMejora: valores.planMejora || undefined,
        details: details.length > 0 ? details : undefined,
    };
}
