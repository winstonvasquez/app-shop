/**
 * Modelos alineados 1:1 con los DTOs reales del backend
 * (microshoplogistica: CarrierSlaController + CarrierController).
 *
 * CORRECCIÓN ronda 2 (2026-07-26): la versión anterior de este archivo
 * describía un contrato inventado (serviceType/zone/maxDeliveryDays/reasons...)
 * que nunca existió en el backend — quedó huérfano desde que se creó, sin
 * componente que lo consumiera. Se reescribe contra los DTOs reales:
 * CarrierSlaResponse, CarrierSlaRequest, CarrierPerformanceResponse,
 * CarrierDashboardResponse y CarrierRecommendation.
 */

/** Espejo de CarrierResponse (backend) — subset usado en el dashboard. */
export interface CarrierSummary {
    id: string;
    code: string;
    name: string;
    serviceType: string;
    contactPhone?: string;
    contactEmail?: string;
    apiUrl?: string;
    active: boolean;
    tenantId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Espejo de CarrierSlaResponse. */
export interface CarrierSla {
    id: string;
    carrierId: string;
    metric: string;
    targetValue: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    measurementPeriod: string;
    tenantId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Espejo de CarrierSlaRequest — body para crear/actualizar un SLA. */
export interface CarrierSlaRequest {
    metric: string;
    targetValue: number;
    warningThreshold?: number | null;
    criticalThreshold?: number | null;
    measurementPeriod: string;
}

/** Espejo de CarrierPerformanceResponse. */
export interface CarrierPerformanceMetric {
    id: string;
    carrierId: string;
    periodStart: string;
    periodEnd: string;
    totalShipments: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    failedDeliveries: number;
    damagedDeliveries: number;
    avgDeliveryHours: number;
    onTimeRate: number;
    failureRate: number;
    damageRate: number;
    totalCost: number;
    tenantId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Espejo de CarrierDashboardResponse. */
export interface CarrierDashboard {
    carrier: CarrierSummary;
    slas: CarrierSla[];
    latestPerformance: CarrierPerformanceMetric | null;
}

/** Espejo de CarrierRecommendation. */
export interface CarrierRecommendation {
    carrierId: string;
    carrierName: string;
    score: number;
    estimatedCost: number;
    estimatedDays: number;
    scoreBreakdown: Record<string, number>;
}

/**
 * Parámetros de GET /api/carriers/recommend.
 * `companyId` NO se envía: el backend lo resuelve de TenantContext (JWT).
 */
export interface RecommendationParams {
    departamento: string;
    provincia?: string;
    weight: number;
    serviceType?: string;
}

/** Opciones sugeridas para el campo libre `metric` (no hay catálogo backend). */
export const CARRIER_SLA_METRICS: { value: string; label: string }[] = [
    { value: 'ON_TIME_RATE', label: 'Tasa de puntualidad' },
    { value: 'AVG_DELIVERY_HOURS', label: 'Horas promedio de entrega' },
    { value: 'DAMAGE_RATE', label: 'Tasa de daños' },
    { value: 'FAILURE_RATE', label: 'Tasa de fallos de entrega' },
    { value: 'COST_PER_SHIPMENT', label: 'Costo por envío' }
];

/** Opciones sugeridas para el campo libre `measurementPeriod`. */
export const CARRIER_SLA_PERIODS: { value: string; label: string }[] = [
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'MONTHLY', label: 'Mensual' },
    { value: 'QUARTERLY', label: 'Trimestral' }
];
