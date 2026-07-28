/**
 * Mapeo contable PCGE para eventos logísticos (envíos, devoluciones, ajustes de inventario).
 * Ver com.microshop.logistica.infrastructure.rest.controller.AccountingMappingController.
 */
export interface AccountingMapping {
    id: string;
    eventType: string;
    debitAccount: string;
    creditAccount: string;
    descriptionTemplate: string | null;
    tenantId: string;
    companyId: string;
    activo: boolean;
    fechaCreacion: string;
    fechaModificacion: string;
}

/**
 * Payload de POST y PUT (`AccountingMappingRequest` del backend).
 * `activo` solo lo interpreta el PUT — permite REACTIVAR un mapeo dado de baja lógica
 * (el alta siempre nace activa). Omitirlo = "no tocar" el estado actual.
 */
export interface AccountingMappingRequest {
    eventType: string;
    debitAccount: string;
    creditAccount: string;
    descriptionTemplate: string;
    activo?: boolean;
}

/**
 * Tipos de evento conocidos, ver LogisticsAccountingService (constantes EVENT_*).
 * El backend NO restringe el valor a este set (columna String libre) — se ofrecen
 * como sugerencia porque son los únicos que el servicio dispara automáticamente hoy.
 */
export const EVENT_TYPES_CONOCIDOS = [
    { value: 'SHIPMENT_COST', label: 'Costo de envío (SHIPMENT_COST)' },
    { value: 'RETURN_REFUND', label: 'Devolución (RETURN_REFUND)' },
    { value: 'INVENTORY_ADJUSTMENT', label: 'Ajuste de inventario (INVENTORY_ADJUSTMENT)' },
] as const;

/** Filtros opcionales para `GET /logistics/api/accounting-mappings` (listado paginado server-side). */
export interface AccountingMappingFiltros {
    page?: number;
    size?: number;
    eventType?: string;
    activo?: boolean;
    debitAccount?: string;
    creditAccount?: string;
    fechaCreacionDesde?: string;
    fechaCreacionHasta?: string;
    q?: string;
}

export interface TestAsientoResultado {
    ok: boolean;
    mensaje: string;
}
