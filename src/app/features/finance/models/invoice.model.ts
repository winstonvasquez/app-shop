export interface InvoiceReceivable {
    id: number;
    tenantId: number;
    clienteId: number;
    clienteNombre?: string;
    clienteDocumento?: string;
    tipoDocumento: string;
    serie: string;
    numero: string;
    fechaEmision: string;
    fechaVencimiento: string;
    moneda: string;
    tipoCambio: number;
    subtotal: number;
    impuesto: number;
    total: number;
    saldoPendiente: number;
    estado: InvoiceStatus;
    ordenVentaId?: number;
    asientoContableId?: number;
    observaciones?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Customer {
    id: number;
    tenantId: number;
    codigo: string;
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
    tipoCliente?: string;
    categoria?: string;
    plazoPagoDias: number;
    limiteCredito: number;
    estado: string;
}

export enum InvoiceStatus {
    PENDIENTE = 'PENDIENTE',
    PAGADA_PARCIAL = 'PAGADA_PARCIAL',
    PAGADA_TOTAL = 'PAGADA_TOTAL',
    VENCIDA = 'VENCIDA',
    ANULADA = 'ANULADA'
}

export interface Payment {
    id: number;
    tenantId: number;
    clienteId: number;
    numeroRecibo: string;
    fechaCobro: string;
    montoTotal: number;
    moneda: string;
    tipoCambio: number;
    formaPago: PaymentMethod;
    cuentaBancoId?: number;
    numeroOperacion?: string;
    asientoContableId?: number;
    observaciones?: string;
    estado: string;
    detalles: PaymentDetail[];
}

export interface PaymentDetail {
    id?: number;
    facturaId: number;
    facturaNumero?: string;
    montoAplicado: number;
}

export enum PaymentMethod {
    EFECTIVO = 'EFECTIVO',
    TRANSFERENCIA = 'TRANSFERENCIA',
    CHEQUE = 'CHEQUE',
    TARJETA = 'TARJETA'
}

export interface CreatePaymentRequest {
    clienteId: number;
    fechaCobro: string;
    montoTotal: number;
    moneda: string;
    formaPago: PaymentMethod;
    cuentaBancoId?: number;
    numeroOperacion?: string;
    observaciones?: string;
    detalles: CreatePaymentDetailRequest[];
}

export interface CreatePaymentDetailRequest {
    facturaId: number;
    montoAplicado: number;
}

export interface InvoiceFilters {
    clienteId?: number;
    estado?: InvoiceStatus;
    fechaDesde?: string;
    fechaHasta?: string;
    vencidas?: boolean;
}
