import { Training, TrainingRequest } from '../../models/training.model';

/**
 * `.value` del formulario de capacitación. Admite `undefined` además de `null` porque el
 * componente usa `.value` y no `getRawValue()`: un control deshabilitado no aparece en
 * `.value`, así que TODO campo puede llegar ausente.
 */
export interface ValoresFormularioCapacitacion {
    nombre?: string | null;
    descripcion?: string | null;
    instructor?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    duracionHoras?: number | null;
}

/**
 * Arma el cuerpo del alta/edición de una capacitación.
 *
 * Regla propia de este formulario: `fechaFin` es obligatoria en el backend pero opcional en
 * la UI, porque una capacitación de un solo día no tiene por qué repetir la fecha. Si el
 * usuario no la pone, la capacitación empieza y termina el mismo día.
 *
 * `descripcion`, `instructor` y `duracionHoras` son opcionales de verdad y viajan ausentes
 * cuando están vacíos.
 *
 * ponytail: `duracionHoras || undefined` conserva el comportamiento original — una duración
 * de 0 horas se envía como ausente, no como 0. En la práctica no se puede dar (el control
 * tiene `Validators.min(1)`), pero se preserva tal cual para no cambiar el contrato.
 */
export function capacitacionRequestDesdeForm(
    valores: ValoresFormularioCapacitacion,
): TrainingRequest {
    return {
        nombre: valores.nombre!,
        descripcion: valores.descripcion || undefined,
        instructor: valores.instructor || undefined,
        fechaInicio: valores.fechaInicio!,
        fechaFin: valores.fechaFin || valores.fechaInicio!,
        duracionHoras: valores.duracionHoras || undefined,
    };
}

/**
 * Precarga el formulario con una capacitación guardada.
 *
 * El modelo declara `descripcion`, `instructor` y `duracionHoras` como `T | null`, y un
 * control reactivo nunca debe recibir null: los textos caen a `''` y la duración a 0, que
 * es el valor con el que arranca el alta.
 */
export function formularioDesdeCapacitacion(t: Training): ValoresFormularioCapacitacion {
    return {
        nombre: t.nombre,
        descripcion: t.descripcion || '',
        instructor: t.instructor || '',
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        duracionHoras: t.duracionHoras || 0,
    };
}
