// models/turno-caja.model.ts

export interface TurnoCaja {
    id: number;
    cajeroId: number;
    cajeroNombre: string;
    companyId: number;
    fechaApertura: string;
    fechaCierre?: string;
    montoApertura: number;
    montoCierreReal?: number;
    estado: 'ABIERTO' | 'CERRADO';
    // KPIs
    totalVentas: number;
    totalEfectivo: number;
    totalTarjeta: number;
    totalYape: number;
    totalPlin: number;
    totalAnulaciones: number;
    totalTransacciones: number;
    boletasEmitidas: number;
    facturasEmitidas: number;
}

export interface TurnoCajaApertura {
    cajeroId: number;
    companyId: number;
    montoApertura: number;
    /** Sucursal donde se abre la caja (opcional): de ella sale la serie del CPE de las ventas del turno. */
    sucursalId?: number;
}

/** Lo que emite el formulario de apertura: monto + sucursal elegida (si hay). */
export type AperturaTurnoForm = Pick<TurnoCajaApertura, 'montoApertura' | 'sucursalId'>;

/** Fila de `GET /pos/turnos` (supervisor). `diferenciaArqueo` = contado − esperado: negativo = faltante. */
export interface TurnoCajaListado {
    id: number;
    cajeroId: number;
    estado: 'ABIERTO' | 'CERRADO';
    fechaApertura: string;
    fechaCierre: string | null;
    montoApertura: number;
    efectivoEsperado: number | null;
    montoCierreContado: number | null;
    diferenciaArqueo: number | null;
    cerradoPor: number | null;
    cierreForzoso: boolean;
    observacionCierre: string | null;
}
