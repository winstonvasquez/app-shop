/**
 * Respuesta del endpoint cross-service /finance/api/admin/erp-health.
 * Estado consolidado de los flujos s2s del ERP (outbox de ventas/compras/logística).
 */
export interface ErpHealthResponse {
    estadoGlobal: ErpEstado;
    ventas: ServiceHealth;
    compras: ServiceHealth;
    logistica: ServiceHealth;
}

export interface ServiceHealth {
    estado: string;
    pendingCount?: number;
    sentTotal?: number;
    sentLast24h?: number;
    deadLetterCount?: number;
    lastProcessedAt?: string | null;
    topErrors?: ErrorEntry[];
    error?: string;
}

export interface ErrorEntry {
    message: string;
    count: number;
}

export type ErpEstado = 'OK' | 'WARN' | 'DEGRADED';
