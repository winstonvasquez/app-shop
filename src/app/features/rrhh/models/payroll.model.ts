export interface Payroll {
    id: number;
    tenantId: number;
    employeeId: number;
    periodo: string;
    sueldoBase: number;
    bonos: number;
    descuentos: number;
    neto: number;
    estado: 'GENERADO' | 'APROBADO' | 'PAGADO' | 'CANCELADO';
    fechaPago?: string;
    pagoId?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface PayrollRequest {
    employeeId: number;
    periodo: string;
    sueldoBase: number;
    bonos?: number;
    descuentos?: number;
}
