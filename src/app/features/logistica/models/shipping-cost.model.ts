/**
 * Analytics de costos de envío — ver ShippingCostController/ShippingCostAnalyticsService
 * en microshoplogistica (com.microshop.logistica).
 */
export interface CostByCarrier {
    carrierId: string;
    carrierName: string;
    totalCost: number;
    shipments: number;
    avgCost: number;
}

export interface CostByZone {
    zone: string;
    totalCost: number;
    shipments: number;
}

export interface CostTrend {
    period: string;
    totalCost: number;
    shipments: number;
}

export interface CostAnalytics {
    totalCost: number;
    avgCostPerShipment: number;
    avgCostPerKg: number;
    totalShipments: number;
    byCarrier: CostByCarrier[];
    byZone: CostByZone[];
    trend: CostTrend[];
}
