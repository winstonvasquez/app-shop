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
}
