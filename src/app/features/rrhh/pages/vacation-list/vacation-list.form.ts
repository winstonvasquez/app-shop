import { TipoVacacion, VacationFiltros, VacationRequestDto } from '../../services/vacation.service';

/**
 * Días calendario que abarca una solicitud, EXTREMOS INCLUIDOS — misma fórmula que
 * `VacationMapper.diasEntre` del backend (`DAYS.between(desde, hasta) + 1`), que es quien
 * realmente descuenta el saldo de vacaciones.
 *
 * Devolver 0 no es un fallo silencioso: es la señal de "rango inválido" (fecha ausente,
 * rango invertido o fecha ilegible) que el `@Min(1)` del DTO rechaza a propósito. Una
 * versión anterior calculaba la diferencia SIN sumar 1, así que una licencia de un solo
 * día quedaba en 0 y la solicitud moría con 400.
 */
export function diasDeVacacion(
    inicio: string | null | undefined,
    fin: string | null | undefined,
): number {
    if (!inicio || !fin) return 0;
    const desde = new Date(inicio);
    const hasta = new Date(fin);
    const dias = Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1;
    return dias > 0 ? dias : 0;
}

/**
 * Estado crudo de los filtros del toolbar. Los ids llegan como TEXTO porque salen de un
 * `<select>`, no como número.
 */
export interface EstadoFiltrosVacacion {
    search: string;
    estado: string;
    tipoVacacion: string;
    employeeId: string;
    departmentId: string;
    aprobadoPorId: string;
    fechaInicioDesde: string | null;
    fechaInicioHasta: string | null;
    fechaFinDesde: string | null;
    fechaFinHasta: string | null;
    fechaAprobacionDesde: string | null;
    fechaAprobacionHasta: string | null;
}

/**
 * Traduce el estado del toolbar a la query paginada del backend.
 *
 * Dos reglas: "sin filtro" se guarda en la UI como `''` (selects) o `null` (rangos de fecha)
 * y en la query se representa OMITIENDO el parámetro, que es lo que hace `toHttpParams` con
 * `undefined`. Y los ids del select son texto: se comprueba el vacío ANTES de convertir,
 * porque `Number('')` da 0 — un id válido que filtraría por un empleado inexistente en vez
 * de no filtrar.
 */
export function filtrosDeVacacion(
    estado: EstadoFiltrosVacacion,
    page: number,
    size: number,
): VacationFiltros {
    return {
        page,
        size,
        search: estado.search || undefined,
        estado: estado.estado || undefined,
        tipoVacacion: estado.tipoVacacion || undefined,
        employeeId: estado.employeeId ? Number(estado.employeeId) : undefined,
        departmentId: estado.departmentId ? Number(estado.departmentId) : undefined,
        aprobadoPorId: estado.aprobadoPorId ? Number(estado.aprobadoPorId) : undefined,
        fechaInicioDesde: estado.fechaInicioDesde || undefined,
        fechaInicioHasta: estado.fechaInicioHasta || undefined,
        fechaFinDesde: estado.fechaFinDesde || undefined,
        fechaFinHasta: estado.fechaFinHasta || undefined,
        fechaAprobacionDesde: estado.fechaAprobacionDesde || undefined,
        fechaAprobacionHasta: estado.fechaAprobacionHasta || undefined,
    };
}

/** `getRawValue()` del formulario de nueva solicitud (incluye `dias`, que está bloqueado). */
export interface ValoresFormularioVacacion {
    employeeId: number | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    dias: number | null;
    tipoVacacion: string | null;
    motivo: string | null;
}

/**
 * Arma el cuerpo del POST de una solicitud de vacaciones.
 *
 * Los cuatro campos obligatorios (`@NotNull` en el DTO) se afirman no-nulos porque el
 * formulario ya pasó por sus `Validators.required` y por la comprobación aparte del rango
 * de fechas — `dias` está deshabilitado y por eso NO se valida solo. Los dos opcionales
 * salen del control como `null` y el backend espera su AUSENCIA.
 */
export function solicitudDeVacacion(valores: ValoresFormularioVacacion): VacationRequestDto {
    return {
        employeeId: valores.employeeId!,
        fechaInicio: valores.fechaInicio!,
        fechaFin: valores.fechaFin!,
        dias: valores.dias!,
        motivo: valores.motivo ?? undefined,
        tipoVacacion: (valores.tipoVacacion as TipoVacacion) ?? undefined,
    };
}
