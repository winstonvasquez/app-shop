/** Métodos de forecasting soportados por el backend (DemandForecastService). */
export type ForecastMethod = 'SMA' | 'EXP_SMOOTHING';

/** Forecast de demanda almacenado — refleja DemandForecastResponse (backend). */
export interface DemandForecast {
    id: string;
    productoId: string;
    sku: string;
    productoNombre: string;
    periodStart: string;
    periodEnd: string;
    forecastMethod: ForecastMethod;
    forecastQuantity: number;
    actualQuantity?: number;
    confidenceLevel: number;
    reorderSuggested: boolean;
    reorderQuantity: number;
    companyId: string;
    createdAt: string;
}

/** Sugerencia de reorden — refleja el record ReorderSuggestion (backend), sin campo "urgency". */
export interface ReorderSuggestion {
    productoId: string;
    sku: string;
    productoNombre: string;
    currentStock: number;
    forecastDemand: number;
    suggestedReorder: number;
    stockMinimo: number;
}
