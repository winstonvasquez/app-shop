import { ContractRequest, ContractType, WorkingDay } from '../../models/contract.model';
import { ContractFiltros } from '../../services/contract.service';
import { MONEDA } from '@shared/constants/sunat.constants';

/** `getRawValue()` del formulario de contrato (los bloqueados también salen). */
export interface ValoresFormularioContrato {
    employeeId: number | null;
    tipoContrato: ContractType | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    salarioBase: number | null;
    moneda: string | null;
    jornadaLaboral: WorkingDay | null;
    horasSemanales: number | null;
    periodoPruebaMeses: number | null;
    documentoContratoUrl: string | null;
}

/**
 * Arma el cuerpo de alta/edición/renovación de contrato.
 *
 * Los cinco obligatorios se afirman no-nulos porque el formulario ya pasó sus
 * `Validators.required`. Para los opcionales la regla es que el backend distingue "sin
 * valor" (ausente) de "valor vacío": `fechaFin` en `''` es un contrato INDEFINIDO, no una
 * fecha en blanco, y `documentoContratoUrl` en `''` es "sin documento adjunto".
 *
 * `moneda` cae a PEN porque un contrato peruano sin moneda declarada es en soles, y el
 * motor de planilla necesita una moneda para calcular la boleta.
 */
export function contratoRequestDesdeForm(valores: ValoresFormularioContrato): ContractRequest {
    return {
        employeeId: valores.employeeId!,
        tipoContrato: valores.tipoContrato!,
        fechaInicio: valores.fechaInicio!,
        fechaFin: valores.fechaFin || undefined,
        salarioBase: valores.salarioBase!,
        moneda: valores.moneda ?? MONEDA.PEN,
        jornadaLaboral: valores.jornadaLaboral!,
        horasSemanales: valores.horasSemanales!,
        periodoPruebaMeses: valores.periodoPruebaMeses ?? undefined,
        documentoContratoUrl: valores.documentoContratoUrl || undefined,
    };
}

/** Estado crudo de los filtros del toolbar de contratos. */
export interface EstadoFiltrosContrato {
    search: string;
    status: string;
    type: string;
    jornadaLaboral: string;
    moneda: string;
    employeeId: number | null;
    departmentId: number | null;
    fechaInicioDesde?: string;
    fechaInicioHasta?: string;
    fechaFinDesde?: string;
    fechaFinHasta?: string;
}

/**
 * Traduce el estado del toolbar a la query paginada.
 *
 * Regla: "sin filtro" es `''` en la UI y AUSENCIA del parámetro en la query — mandar `''`
 * haría que el backend filtre por cadena vacía y no devuelva nada. Las claves foráneas ya
 * usan `null` y viajan tal cual.
 */
export function filtrosDeContrato(
    estado: EstadoFiltrosContrato,
    page: number,
    size: number,
): ContractFiltros {
    return {
        page,
        size,
        search: estado.search || undefined,
        status: estado.status || undefined,
        type: estado.type || undefined,
        jornadaLaboral: estado.jornadaLaboral || undefined,
        moneda: estado.moneda || undefined,
        employeeId: estado.employeeId,
        departmentId: estado.departmentId,
        fechaInicioDesde: estado.fechaInicioDesde,
        fechaInicioHasta: estado.fechaInicioHasta,
        fechaFinDesde: estado.fechaFinDesde,
        fechaFinHasta: estado.fechaFinHasta,
    };
}
