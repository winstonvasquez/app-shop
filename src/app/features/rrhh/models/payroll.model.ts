/** Estado de una planilla persistida (espeja Payroll.PayrollStatus del backend). */
export type PayrollStatus = 'GENERADO' | 'APROBADO' | 'PAGADO' | 'CANCELADO';

/** Tipo de concepto de un detalle de planilla (espeja PayrollDetail.ConceptType). */
export type ConceptType = 'INGRESO' | 'DESCUENTO' | 'APORTE_EMPLEADOR';

/** Línea de detalle de una boleta (concepto individual). Espeja PayrollDetailDto. */
export interface PayrollDetail {
    id: number;
    concepto: string;
    tipo: ConceptType;
    monto: number;
    cantidad?: number | null;
    tasa?: number | null;
}

/**
 * Planilla/boleta persistida — espejo fiel de PayrollResponseDto del backend
 * (microshopusers, /hr/api/payroll). NO se calcula en el cliente: el motor
 * peruano (AFP/ONP, Renta 5ta, gratificación, CTS, horas extra) vive en el backend.
 */
export interface Payroll {
    id: number;
    tenantId: number;
    employeeId: number;
    employeeName?: string;
    periodo: string;
    sueldoBase: number;
    bonos?: number;
    descuentos?: number;
    /** Sistema previsional aplicado, ej. "AFP - INTEGRA" u "ONP". */
    afpOnp?: string;
    montoAfpOnp?: number;
    essalud?: number;
    rentaQuinta?: number;
    cts?: number;
    gratificacion?: number;
    asignacionFamiliar?: number;
    diasTrabajados?: number;
    horasExtras?: number;
    montoHorasExtras?: number;
    neto: number;
    estado: PayrollStatus;
    fechaPago?: string;
    pagoId?: number;
    details?: PayrollDetail[];
    createdAt: string;
    updatedAt?: string;
}

/**
 * Payload para crear una planilla individual (POST /hr/api/payroll). Espeja
 * PayrollRequestDto — solo employeeId/periodo/sueldoBase son obligatorios en
 * el backend (@NotNull/@NotBlank); el resto es opcional (@DecimalMin/@Min).
 */
export interface PayrollRequest {
    employeeId: number;
    periodo: string;
    sueldoBase: number;
    bonos?: number;
    descuentos?: number;
    asignacionFamiliar?: number;
    montoHorasExtras?: number;
    diasTrabajados?: number;
}
