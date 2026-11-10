/**
 * Mapeo contable PCGE para eventos logísticos (ajustes de inventario).
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
 * Tipos de evento que logística contabiliza (InventoryMovementService → /automatico de contabilidad).
 * Las cuentas del mapeo reemplazan a las de respaldo (faltante 659/201, sobrante 201/759).
 */
export const EVENT_TYPES_CONOCIDOS = [
    { value: 'AJUSTE_INVENTARIO_FALTANTE', label: 'Ajuste de inventario — faltante (AJUSTE_INVENTARIO_FALTANTE)' },
    { value: 'AJUSTE_INVENTARIO_SOBRANTE', label: 'Ajuste de inventario — sobrante (AJUSTE_INVENTARIO_SOBRANTE)' },
] as const;

/** Tipos antiguos que ya nadie consume: el mapeo existe pero NO genera asiento. */
export const EVENT_TYPES_SIN_EFECTO: readonly string[] = ['SHIPMENT_COST', 'RETURN_REFUND', 'INVENTORY_ADJUSTMENT'];

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

/** Respuesta 200 de POST /test/{eventType}; el rechazo de contabilidad llega como 400 con su motivo. */
export interface TestAsientoResultado {
    aceptado: boolean;
    tipo: string;
}
