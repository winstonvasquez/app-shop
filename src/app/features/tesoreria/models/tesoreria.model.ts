export interface Payment {
    id?: number;
    tipoPago: 'PROVEEDOR' | 'NÓMINA' | 'IMPUESTO' | 'OTRO';
    beneficiarioNombre: string;
    monto: number;
    moneda: string;
    estado: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    fechaSolicitud: string;
    concepto: string;
    numeroOperacion?: string;
    createdAt?: string;
}

export interface PaymentRequest {
    tenantId: number;
    tipoPago: string;
    monto: number;
    moneda: string;
    metodoPago: string;
    fechaSolicitud: string;
    beneficiarioNombre: string;
    beneficiarioDocumento: string;
    concepto: string;
}

export interface CashRegister {
    id?: number;
    nombre: string;
    estado: 'ABIERTA' | 'CERRADA';
    saldoActual: number;
    fechaApertura?: string;
    fechaCierre?: string;
}

export interface FinancialMovement {
    id?: number;
    tipoMovimiento: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
    origen: string;
    monto: number;
    moneda: string;
    fecha: string;
    descripcion: string;
    numeroOperacion?: string;
}
