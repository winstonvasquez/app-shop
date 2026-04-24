export type ForecastMethod = 'MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING' | 'LINEAR_REGRESSION';

export interface ForecastPeriod {
    period: string;
    forecastedQty: number;
    confidence?: number;
}

export interface DemandForecast {
    id: string;
    productoId: string;
    method: ForecastMethod;
    generatedAt: string;
    periods: ForecastPeriod[];
}

export interface ReorderSuggestion {
    productoId: string;
    sku: string;
    productName: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQty: number;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}
