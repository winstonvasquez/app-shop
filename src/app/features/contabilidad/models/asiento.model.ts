export interface Asiento {
    id: string;
    numero: number;
    codigo: string;
    fecha: string;
    glosa: string;
    tipo: 'AUTOMATICO' | 'MANUAL' | 'CIERRE';
    origen: 'VENTA' | 'COMPRA' | 'TESORERIA' | 'LOGISTICA' | 'MANUAL';
    estado: 'BORRADOR' | 'CONAFECTAR' | 'DEFINITIVO' | 'CERRADO';
    periodoId: string;
    periodoNombre?: string;
    totalDebe: number;
    totalHaber: number;
    movimientos: Movimiento[];
}

export interface Movimiento {
    id: string;
    cuentaId: string;
    codigoCuenta: string;
    nombreCuenta: string;
    debe: number;
    haber: number;
    glosa: string;
}

export interface AsientoRequest {
    fecha: string;
    glosa: string;
    tipo: string;
    origen: string;
    periodoId: string;
    companyId: string;
    tenantId: string;
    movimientos: MovimientoRequest[];
}

export interface MovimientoRequest {
    cuentaId: string;
    codigoCuenta: string;
    debe: number;
    haber: number;
    glosa: string;
}
