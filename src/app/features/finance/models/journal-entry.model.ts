export interface JournalEntry {
    id: number;
    tenantId: number;
    numeroComprobante: string;
    tipoComprobante: VoucherType;
    fechaRegistro: string;
    fechaContable: string;
    periodo: string;
    glosa: string;
    totalDebito: number;
    totalCredito: number;
    estado: JournalEntryStatus;
    origen?: string;
    documentoOrigenTipo?: string;
    documentoOrigenId?: number;
    observaciones?: string;
    cerrado: boolean;
    detalles: JournalEntryDetail[];
    createdAt?: string;
    updatedAt?: string;
}

export interface JournalEntryDetail {
    id?: number;
    linea: number;
    cuentaId: number;
    cuentaCodigo?: string;
    cuentaNombre?: string;
    tipoMovimiento: MovementType;
    monto: number;
    glosa?: string;
    terceroTipo?: string;
    terceroId?: number;
    centroCostoId?: number;
    documentoReferencia?: string;
}

export enum VoucherType {
    DIARIO = 'DIARIO',
    INGRESO = 'INGRESO',
    EGRESO = 'EGRESO',
    TRASPASO = 'TRASPASO',
    APERTURA = 'APERTURA',
    CIERRE = 'CIERRE'
}

export enum JournalEntryStatus {
    BORRADOR = 'BORRADOR',
    REGISTRADO = 'REGISTRADO',
    ANULADO = 'ANULADO'
}

export enum MovementType {
    DEBITO = 'DEBITO',
    CREDITO = 'CREDITO'
}

export interface CreateJournalEntryRequest {
    tipoComprobante: VoucherType;
    fechaContable: string;
    glosa: string;
    observaciones?: string;
    detalles: CreateJournalEntryDetailRequest[];
}

export interface CreateJournalEntryDetailRequest {
    linea: number;
    cuentaId: number;
    tipoMovimiento: MovementType;
    monto: number;
    glosa?: string;
    terceroTipo?: string;
    terceroId?: number;
    centroCostoId?: number;
    documentoReferencia?: string;
}

export interface JournalEntryFilters {
    periodo?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    tipoComprobante?: VoucherType;
    estado?: JournalEntryStatus;
    cuentaId?: number;
}
