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

export interface AccountingMappingRequest {
    eventType: string;
    debitAccount: string;
    creditAccount: string;
    descriptionTemplate: string;
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

export interface TestAsientoResultado {
    ok: boolean;
    mensaje: string;
}
