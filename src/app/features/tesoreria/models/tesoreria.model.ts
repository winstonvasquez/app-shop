export interface Payment {
    id?: number;
    tipoPago: 'PROVEEDOR' | 'PLANILLA' | 'SERVICIO' | 'IMPUESTO' | 'OTRO';
    beneficiarioNombre: string;
    monto: number;
    moneda: string;
    estado: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
    fechaSolicitud: string;
    concepto: string;
    metodoPago?: string;
    numeroOperacion?: string;
    bankAccountId?: number | null;
    cajaId?: number | null;
    createdAt?: string;
}

/** Cuerpo de POST /pagos/{id}/pagar (PagarPagoRequestDto): exactamente uno de bankAccountId/cajaId. */
export interface PagarPagoRequest {
    bankAccountId?: number;
    cajaId?: number;
    numeroOperacion?: string;
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
    /** Cuenta bancaria de la que sale el dinero (PaymentRequestDto.bankAccountId, backend). Opcional. */
    bankAccountId?: number;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface CashRegister {
    id?: number;
    nombre: string;
    moneda?: string;
    estado: 'ABIERTA' | 'CERRADA';
    saldoActual: number;
    saldoInicial?: number;
    /** Contado - saldo del sistema al cerrar (null si nunca se cerró). */
    diferenciaCierre?: number | null;
    fechaApertura?: string;
    fechaCierre?: string;
    observaciones?: string;
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
    origenId?: number | null;
    referencia?: string | null;
    /** En una anulación (ANUL-<id>) apunta al movimiento original. */
    relacionadoId?: number | null;
    fechaVencimiento?: string | null;
    /** true = el movimiento se registró pero su asiento contable falló y hay que contabilizarlo a mano. */
    asientoPendiente?: boolean;
}

export interface BankAccount {
    id?: number;
    tenantId: number;
    banco: string;
    numeroCuenta: string;
    tipoCuenta: 'CORRIENTE' | 'AHORROS' | 'CTS' | 'DETRACCIONES';
    moneda: string;
    saldoActual: number;
    estado: 'ACTIVA' | 'INACTIVA' | 'BLOQUEADA';
    cuentaInterbancaria?: string;
    descripcion?: string;
    createdAt?: string;
}

export interface BankAccountRequest {
    tenantId: number;
    banco: string;
    numeroCuenta: string;
    tipoCuenta: string;
    moneda: string;
    saldoInicial: number;
    cuentaInterbancaria?: string;
    descripcion?: string;
}
