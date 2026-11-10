/** LiquidacionCeseDto (GET/POST /hr/api/liquidaciones). En el cálculo, id/observaciones/registradoPor/createdAt vienen null. */
export interface LiquidacionCese {
    id: number | null;
    employeeId: number;
    employeeName: string;
    fechaIngreso: string;
    fechaCese: string;
    remuneracionComputable: number;
    mesesGratificacion: number;
    gratificacionTrunca: number;
    bonificacionExtraordinaria: number;
    mesesCts: number;
    /** Se paga directa al trabajador, no se deposita. */
    ctsTrunca: number;
    diasVacacionesPendientes: number;
    vacacionesNoGozadas: number;
    mesesRecordVacacional: number;
    vacacionesTruncas: number;
    total: number;
    observaciones: string | null;
    registradoPor: number | null;
    createdAt: string | null;
}
