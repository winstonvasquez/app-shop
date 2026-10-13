import { Employee, EmployeeRequest, EmployeeStatus } from '../../models/employee.model';
import { EmployeeFiltros } from '../../services/employee.service';

/**
 * Valores del drawer de empleado. Los nombres coinciden 1:1 con los controles de
 * `employeeForm`; los TIPOS son los del control (texto libre siempre `string`, claves
 * foráneas `number | null`), no los del modelo `Employee`, donde casi todo es opcional.
 */
export interface ValoresFormularioEmpleado {
    codigoEmpleado: string;
    nombres: string;
    apellidos: string;
    documentoIdentidad: string;
    tipoDocumento: string;
    fechaNacimiento: string;
    genero: string;
    estadoCivil: string;
    fechaIngreso: string;
    cargo: string;
    area: string;
    email: string;
    telefono: string;
    estado: EmployeeStatus;
    departmentId: number | null;
    positionId: number | null;
    supervisorId: number | null;
    userId: number | null;
    sistemaPrevisional: string;
    afpNombre: string;
    fechaSalida: string;
    motivoSalida: string;
}

/**
 * Traduce un empleado guardado a los valores que espera el formulario reactivo.
 *
 * Regla: un control de texto NUNCA debe recibir `undefined`/`null` — se renderiza vacío
 * pero `getRawValue()` lo devuelve tal cual y el PUT (que es reemplazo completo) borraría
 * el dato. Por eso todo opcional de texto cae a `''` y toda clave foránea a `null`.
 *
 * Dos campos tienen default de NEGOCIO, no de presentación: `tipoDocumento` es DNI porque
 * es lo que exige PLAME para el grueso de la planilla peruana, y `sistemaPrevisional` es
 * ONP porque es lo que `PayrollCommandService.calcularPlanillaPeruana` asume cuando el
 * empleado no declara AFP. Un valor ya guardado nunca se pisa con esos defaults.
 */
export function formularioDesdeEmpleado(employee: Employee): ValoresFormularioEmpleado {
    return {
        codigoEmpleado: employee.codigoEmpleado,
        nombres: employee.nombres,
        apellidos: employee.apellidos,
        documentoIdentidad: employee.documentoIdentidad,
        tipoDocumento: employee.tipoDocumento ?? 'DNI',
        fechaNacimiento: employee.fechaNacimiento ?? '',
        genero: employee.genero ?? '',
        estadoCivil: employee.estadoCivil ?? '',
        fechaIngreso: employee.fechaIngreso,
        cargo: employee.cargo ?? '',
        area: employee.area ?? '',
        email: employee.email ?? '',
        telefono: employee.telefono ?? '',
        estado: employee.estado,
        departmentId: employee.departmentId ?? null,
        positionId: employee.positionId ?? null,
        supervisorId: employee.supervisorId ?? null,
        userId: employee.userId ?? null,
        sistemaPrevisional: employee.sistemaPrevisional ?? 'ONP',
        afpNombre: employee.afpNombre ?? '',
        fechaSalida: employee.fechaSalida ?? '',
        motivoSalida: employee.motivoSalida ?? '',
    };
}

/** Estado crudo de los filtros del toolbar, tal como lo mantienen las señales del componente. */
export interface EstadoFiltrosEmpleado {
    search: string;
    estado: string;
    departmentId: number | null;
    positionId: number | null;
    supervisorId: number | null;
    tipoDocumento: string;
    sistemaPrevisional: string;
    afpNombre: string;
    genero: string;
    estadoCivil: string;
    fechaIngresoDesde?: string;
    fechaIngresoHasta?: string;
    fechaSalidaDesde?: string;
    fechaSalidaHasta?: string;
    fechaNacimientoDesde?: string;
    fechaNacimientoHasta?: string;
}

/**
 * Traduce el estado del toolbar a la query paginada del backend.
 *
 * Regla: "sin filtro" se representa en la UI con `''` (select en blanco) y en la query con
 * la AUSENCIA del parámetro. Enviar `''` haría que el backend filtre por cadena vacía y no
 * devuelva nada, así que todo texto vacío pasa a `undefined`, que es justo lo que
 * `toHttpParams` omite. Las claves foráneas ya usan `null` y viajan tal cual.
 */
export function filtrosDeEmpleado(
    estado: EstadoFiltrosEmpleado,
    page: number,
    size: number,
): EmployeeFiltros {
    return {
        page,
        size,
        search: estado.search || undefined,
        status: estado.estado || undefined,
        departmentId: estado.departmentId,
        positionId: estado.positionId,
        supervisorId: estado.supervisorId,
        tipoDocumento: estado.tipoDocumento || undefined,
        sistemaPrevisional: estado.sistemaPrevisional || undefined,
        afpNombre: estado.afpNombre || undefined,
        genero: estado.genero || undefined,
        estadoCivil: estado.estadoCivil || undefined,
        fechaIngresoDesde: estado.fechaIngresoDesde,
        fechaIngresoHasta: estado.fechaIngresoHasta,
        fechaSalidaDesde: estado.fechaSalidaDesde,
        fechaSalidaHasta: estado.fechaSalidaHasta,
        fechaNacimientoDesde: estado.fechaNacimientoDesde,
        fechaNacimientoHasta: estado.fechaNacimientoHasta,
    };
}

/**
 * Arma el cuerpo del alta/edición de empleado a partir del `getRawValue()` del drawer.
 *
 * Dos reglas:
 *
 * 1. `genero` y `estadoCivil` son enums del backend (Employee.Gender / MaritalStatus) y
 *    Jackson NO coacciona `''` a null en un campo enum → 400 InvalidFormatException. El
 *    `''` del control sin elegir tiene que salir como `undefined`.
 * 2. El PUT es un REEMPLAZO completo: en edición se parte del empleado original para que
 *    los campos que el drawer no muestra (dirección, educación, nacionalidad, tipo de
 *    sangre…) no se sobrescriban a null. En alta no hay original y viaja solo el formulario.
 */
export function payloadDeEmpleado(
    valores: Record<string, unknown>,
    original: Employee | null,
): EmployeeRequest {
    const normalizado: Record<string, unknown> = { ...valores };
    if (normalizado['genero'] === '') normalizado['genero'] = undefined;
    if (normalizado['estadoCivil'] === '') normalizado['estadoCivil'] = undefined;
    const cuerpo = original ? { ...original, ...normalizado } : normalizado;
    return cuerpo as unknown as EmployeeRequest;
}
